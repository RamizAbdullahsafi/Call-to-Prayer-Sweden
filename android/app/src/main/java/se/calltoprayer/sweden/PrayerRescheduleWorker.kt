package se.calltoprayer.sweden

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.capacitorjs.plugins.localnotifications.LocalNotification
import com.getcapacitor.CapConfig
import com.getcapacitor.JSObject
import com.getcapacitor.Logger
import com.capacitorjs.plugins.localnotifications.LocalNotificationManager
import com.capacitorjs.plugins.localnotifications.LocalNotificationSchedule
import com.capacitorjs.plugins.localnotifications.NotificationStorage
import org.json.JSONException
import org.json.JSONObject
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.*

/**
 * Refreshes prayer notifications from persisted JS config (Capacitor Preferences) + bönetider API.
 */
class PrayerRescheduleWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    companion object {
        private const val PREFS = "CapacitorStorage"
        private const val CONFIG_KEY = "ctp.prayerScheduleConfig.v1"
        private const val CHANNEL_LOUD = "prayer-times-v2"
        private const val CHANNEL_QUIET = "prayer-times-quiet-v2"
        private val KEY_ORDER = arrayOf("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha")

        private fun formatYmd(cal: Calendar): String {
            val y = cal[Calendar.YEAR]
            val m = cal[Calendar.MONTH] + 1
            val d = cal[Calendar.DAY_OF_MONTH]
            return String.format(Locale.US, "%04d-%02d-%02d", y, m, d)
        }

        @Throws(ParseException::class)
        private fun prayerInstantLocal(dateYmd: String, hhmm: String): Date {
            val ymd = dateYmd.split("-".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
            val hm = hhmm.split(":".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
            val cal = Calendar.getInstance()
            cal[Calendar.YEAR] = ymd[0].toInt()
            cal[Calendar.MONTH] = ymd[1].toInt() - 1
            cal[Calendar.DAY_OF_MONTH] = ymd[2].toInt()
            cal[Calendar.HOUR_OF_DAY] = hm[0].toInt()
            cal[Calendar.MINUTE] = hm[1].toInt()
            cal[Calendar.SECOND] = 0
            cal[Calendar.MILLISECOND] = 0
            return cal.time
        }

        private fun nativeNotificationId(dateYmd: String, key: String): Int {
            val dayPart = dateYmd.replace("-", "").toInt() % 100000
            var idx = 0
            for (i in KEY_ORDER.indices) {
                if (KEY_ORDER[i] == key) {
                    idx = i
                    break
                }
            }
            return dayPart * 10 + idx
        }

        private fun formatUtcIso(date: Date): String {
            val sdf = SimpleDateFormat(LocalNotificationSchedule.JS_DATE_FORMAT, Locale.US)
            sdf.timeZone = TimeZone.getTimeZone("UTC")
            return sdf.format(date)
        }
    }

    override fun doWork(): Result {
        val ctx = applicationContext
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(CONFIG_KEY, null)
        if (raw.isNullOrEmpty()) {
            return Result.success()
        }

        val cfg: JSONObject = try {
            JSONObject(raw)
        } catch (e: JSONException) {
            return Result.success()
        }

        val apiFetchUrl = cfg.optString("apiFetchUrl", "")
        if (apiFetchUrl.isEmpty()) {
            Logger.debug(Logger.tags("CTP"), "PrayerRescheduleWorker: no absolute apiFetchUrl — skip")
            return Result.success()
        }

        val city = cfg.optString("city", "")
        if (city.isEmpty()) {
            return Result.success()
        }

        val silent = cfg.optBoolean("notificationSilent", false)
        val title = cfg.optString("title", "Prayer Sweden")
        val daysAhead = cfg.optInt("daysAhead", 60)

        val keysJson = cfg.optJSONArray("keys")
        if (keysJson == null || keysJson.length() == 0) {
            return Result.success()
        }

        val labels = cfg.optJSONObject("labels")

        if (!PrayerNotificationHelper.areNotificationsEnabled(ctx)) {
            return Result.success()
        }

        PrayerNotificationHelper.ensurePrayerChannels(ctx)

        val storage = NotificationStorage(ctx)
        val manager = LocalNotificationManager(storage, null, ctx, CapConfig.loadDefault(ctx))

        val now = Date()
        val notifications = mutableListOf<LocalNotification>()

        val dayCursor = Calendar.getInstance()
        for (offset in 0 until daysAhead) {
            if (offset > 0) {
                dayCursor.add(Calendar.DAY_OF_MONTH, 1)
            }
            val ymd = formatYmd(dayCursor)

            val day: BonetiderClient.PrayerDay = try {
                BonetiderClient.fetchPrayerTimes(apiFetchUrl, city, ymd)
            } catch (e: Exception) {
                Logger.warn(Logger.tags("CTP"), "fetch failed $ymd: ${e.message}")
                continue
            }

            for (ki in 0 until keysJson.length()) {
                try {
                    val key = keysJson.getString(ki)
                    val timeStr = day.schedule[key] ?: continue

                    val at = prayerInstantLocal(ymd, timeStr)
                    if (at.time <= now.time) continue

                    val label = labels?.optString(key, key) ?: key
                    val body = "$label ($timeStr)"

                    val id = nativeNotificationId(ymd, key)
                    val channelId = if (silent) CHANNEL_QUIET else CHANNEL_LOUD

                    val json = JSObject()
                    json.put("id", id)
                    json.put("title", title)
                    json.put("body", body)
                    json.put("channelId", channelId)
                    val sched = JSObject()
                    sched.put("at", formatUtcIso(at))
                    sched.put("allowWhileIdle", true)
                    json.put("schedule", sched)
                    val extra = JSObject()
                    extra.put("ctp", true)
                    extra.put("key", key)
                    json.put("extra", extra)

                    val ln = LocalNotification.buildNotificationFromJSObject(json)
                    notifications.add(ln)
                } catch (e: Exception) {
                    Logger.warn(Logger.tags("CTP"), "build notification: ${e.message}")
                }
            }
        }

        if (notifications.isEmpty()) {
            return Result.success()
        }

        // Only clear old notifications if we successfully fetched new ones to replace them.
        PrayerNotificationHelper.cancelAllScheduled(ctx)

        val chunk = 40
        try {
            var i = 0
            while (i < notifications.size) {
                val end = (i + chunk).coerceAtMost(notifications.size)
                val part = notifications.subList(i, end)
                manager.schedule(null, ArrayList(part))
                i += chunk
            }
        } catch (e: Exception) {
            Logger.error(Logger.tags("CTP"), "schedule failed", e)
            return Result.failure()
        }

        return Result.success()
    }
}
