package se.calltoprayer.sweden

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONArray

/**
 * Exact alarms for full azan playback when the WebView is not alive (Capacitor
 * [LocalNotificationsPlugin.fireReceived] only notifies JS if the bridge/WebView exists).
 */
object AzanAlarmScheduler {

    private const val TAG = "AzanAlarmScheduler"
    const val AZAN_ALARM_ID_OFFSET = 10_000_000

    private const val PREFS = "ctp_native_azan"
    private const val KEY_IDS = "scheduled_alarm_ids"

    private fun immutableFlag(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE
        } else {
            0
        }

    fun cancelAll(context: Context) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_IDS, null) ?: return
        val ids = raw.split(",").mapNotNull { it.trim().toIntOrNull() }
        for (id in ids) {
            val intent = Intent(context, AzanAlarmReceiver::class.java)
            val pi = PendingIntent.getBroadcast(
                context,
                id,
                intent,
                PendingIntent.FLAG_NO_CREATE or immutableFlag()
            )
            if (pi != null) {
                am.cancel(pi)
                pi.cancel()
            }
        }
        prefs.edit().remove(KEY_IDS).apply()
        Log.d(TAG, "cancelled ${ids.size} azan alarms")
    }

    /**
     * @param alarms JSON array of { id: number, atMs: number, key: string }
     */
    fun scheduleFromJs(context: Context, audioUrl: String, volume: Float, alarms: JSONArray) {
        cancelAll(context)
        if (audioUrl.isBlank()) {
            return
        }
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val scheduledIds = mutableListOf<Int>()
        val now = System.currentTimeMillis()
        for (i in 0 until alarms.length()) {
            try {
                val o = alarms.getJSONObject(i)
                val id = o.getInt("id")
                val atMs = o.getLong("atMs")
                val key = o.getString("key")
                if (atMs <= now) {
                    continue
                }
                val intent = Intent(context, AzanAlarmReceiver::class.java).apply {
                    putExtra(AzanAlarmReceiver.EXTRA_AUDIO_URL, audioUrl)
                    putExtra(AzanAlarmReceiver.EXTRA_VOLUME, volume)
                    putExtra(AzanAlarmReceiver.EXTRA_KEY, key)
                }
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag()
                val pi = PendingIntent.getBroadcast(context, id, intent, flags)
                scheduledIds.add(id)
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pi)
                    } else {
                        @Suppress("DEPRECATION")
                        am.setExact(AlarmManager.RTC_WAKEUP, atMs, pi)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "setExactAndAllowWhileIdle failed id=$id", e)
                }
            } catch (e: Exception) {
                Log.e(TAG, "schedule item $i", e)
            }
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_IDS, scheduledIds.joinToString(","))
            .apply()
        Log.d(TAG, "scheduled ${scheduledIds.size} azan alarms")
    }
}
