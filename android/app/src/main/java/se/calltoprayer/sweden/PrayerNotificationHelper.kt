package se.calltoprayer.sweden

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import com.capacitorjs.plugins.localnotifications.NotificationStorage
import com.capacitorjs.plugins.localnotifications.TimedNotificationPublisher

/**
 * Cancels all Capacitor-local-notification alarms (same storage as JS) so background
 * reschedule does not duplicate.
 */
object PrayerNotificationHelper {

    @JvmStatic
    fun cancelAllScheduled(context: Context) {
        val storage = NotificationStorage(context)
        val ids = storage.savedNotificationIds
        val nm = NotificationManagerCompat.from(context)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager?

        for (idStr in ids) {
            val notificationId = idStr.toIntOrNull() ?: continue
            nm.cancel(notificationId)

            val intent = Intent(context, TimedNotificationPublisher::class.java)
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_MUTABLE
            } else {
                0
            }
            val pi = PendingIntent.getBroadcast(context, notificationId, intent, flags)
            if (alarmManager != null && pi != null) {
                alarmManager.cancel(pi)
            }
            storage.deleteNotification(idStr)
        }
    }

    @JvmStatic
    fun areNotificationsEnabled(context: Context): Boolean {
        return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    @JvmStatic
    fun ensurePrayerChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val nm = context.getSystemService(NotificationManager::class.java) ?: return

        val pkg = context.packageName
        val rawId = context.resources.getIdentifier("azan_notify", "raw", pkg)
        var soundUri: Uri? = null
        if (rawId != 0) {
            soundUri = Uri.parse("${ContentResolver.SCHEME_ANDROID_RESOURCE}://$pkg/$rawId")
        }

        val audioAttributes = AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build()

        val loud = NotificationChannel(
            "prayer-times-v2",
            "Prayer times",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Alerts when it is time to pray (with sound)."
            enableVibration(true)
            if (soundUri != null) {
                setSound(soundUri, audioAttributes)
            }
        }
        nm.createNotificationChannel(loud)

        val quiet = NotificationChannel(
            "prayer-times-quiet-v2",
            "Prayer times (quiet)",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Visual reminder without notification sound."
            enableVibration(false)
            setSound(null, null)
        }
        nm.createNotificationChannel(quiet)
    }
}
