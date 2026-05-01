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
import org.json.JSONArray
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
        private const val CHANNEL_LOUD = "ctp-prayer-alarm-v3"
        private const val CHANNEL_QUIET = "ctp-prayer-quiet-v3"
        private const val CHANNEL_VIBRATE = "ctp-prayer-vibrate-v3"
        private const val SMALL_ICON = "ic_stat_prayer_bell"
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
        val notifyMode = cfg.optString("notifyMode", "")
        val title = cfg.optString("title", "Prayer Sweden")
        val daysAhead = cfg.optInt("daysAhead", 60)

        val keysJson = cfg.optJSONArray("keys")
        if (keysJson == null || keysJson.length() == 0) {
            return Result.success()
        }

        val labels = cfg.optJSONObject("labels")

        val azanUrlLegacy = cfg.optString("azanAudioUrl", "")
        val azanUrlByKeyJson = cfg.optJSONObject("azanAudioUrlByKey")
        val azanUrlByKey = mutableMapOf<String, String>()
        if (azanUrlByKeyJson != null) {
            for (k in KEY_ORDER) {
                val url = azanUrlByKeyJson.optString(k, "")
                if (url.isNotEmpty()) azanUrlByKey[k] = url
            }
        }
        val hasAzanAudio = azanUrlByKey.isNotEmpty() || azanUrlLegacy.isNotEmpty()
        val azanEnabled = if (cfg.has("azanPlayEnabled")) {
            cfg.optBoolean("azanPlayEnabled", false)
        } else {
            notifyMode == "full" && hasAzanAudio
        }
        val azanVol = cfg.optDouble("azanVolume", 0.92).toFloat()
        val azanKeysJson = cfg.optJSONArray("azanKeys")
        val azanKeysSet = mutableSetOf<String>()
        if (azanKeysJson != null) {
            for (ai in 0 until azanKeysJson.length()) {
                val k = azanKeysJson.optString(ai, "")
                if (k.isNotEmpty()) azanKeysSet.add(k)
            }
        }
        val azanAlarms = JSONArray()

        if (!PrayerNotificationHelper.areNotificationsEnabled(ctx)) {
            return Result.success()
        }

        PrayerNotificationHelper.ensurePrayerChannels(ctx)

        val storage = NotificationStorage(ctx)
        val manager = LocalNotificationManager(storage, null, ctx, CapConfig.loadDefault(ctx))

        val now = Date()
        val notifications = mutableListOf<LocalNotification>()
        /** True if at least one day was resolved (network or JS-mirrored cache); false if nothing usable. */
        var anyPrayerDayFetched = false

        val dayCursor = Calendar.getInstance()
        for (offset in 0 until daysAhead) {
            if (offset > 0) {
                dayCursor.add(Calendar.DAY_OF_MONTH, 1)
            }
            val ymd = formatYmd(dayCursor)

            val day: BonetiderClient.PrayerDay? = try {
                BonetiderClient.fetchPrayerTimes(apiFetchUrl, city, ymd)
            } catch (e: Exception) {
                Logger.warn(Logger.tags("CTP"), "fetch failed $ymd: ${e.message}")
                PrayerDayCache.load(prefs, city, ymd)?.also {
                    Logger.debug(Logger.tags("CTP"), "PrayerRescheduleWorker: cache hit $ymd")
                }
            }
            if (day == null) continue
            anyPrayerDayFetched = true

            for (ki in 0 until keysJson.length()) {
                try {
                    val key = keysJson.getString(ki)
                    val timeStr = day.schedule[key] ?: continue

                    val at = prayerInstantLocal(ymd, timeStr)
                    if (at.time <= now.time) continue

                    val label = labels?.optString(key, key) ?: key
                    val body = "$label ($timeStr)"

                    val id = nativeNotificationId(ymd, key)
                    val azanUrlForKey = azanUrlByKey[key] ?: azanUrlLegacy
                    val useNativeAzanForKey =
                        azanKeysSet.isEmpty() || azanKeysSet.contains(key)
                    if (azanEnabled && azanUrlForKey.isNotEmpty() && useNativeAzanForKey) {
                        val ao = JSONObject()
                        ao.put("id", AzanAlarmScheduler.AZAN_ALARM_ID_OFFSET + id)
                        ao.put("atMs", at.time)
                        ao.put("key", key)
                        ao.put("audioUrl", azanUrlForKey)
                        azanAlarms.put(ao)
                    }
                    val channelId = when {
                        notifyMode == "vibrate" -> CHANNEL_VIBRATE
                        notifyMode == "silent" -> CHANNEL_QUIET
                        notifyMode == "full" || notifyMode == "notify_only" -> CHANNEL_LOUD
                        notifyMode.isEmpty() && silent -> CHANNEL_QUIET
                        else -> CHANNEL_LOUD
                    }

                    val json = JSObject()
                    json.put("id", id)
                    json.put("title", title)
                    json.put("body", body)
                    // Force app-provided monochrome status-bar icon for prayer notifications.
                    json.put("smallIcon", SMALL_ICON)
                    json.put("channelId", channelId)
                    if (channelId == CHANNEL_LOUD) {
                        json.put("sound", "default")
                    }
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
            // No future slots: only clear azan if we had real schedule data but nothing left to fire.
            if (anyPrayerDayFetched) {
                AzanAlarmScheduler.cancelAll(ctx)
            }
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

        if (azanEnabled && azanAlarms.length() > 0) {
            AzanAlarmScheduler.scheduleFromJs(ctx, azanVol, azanAlarms)
        } else {
            AzanAlarmScheduler.cancelAll(ctx)
        }

        return Result.success()
    }
}
