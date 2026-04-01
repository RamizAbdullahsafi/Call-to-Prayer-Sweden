package se.calltoprayer.sweden;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;
import com.capacitorjs.plugins.localnotifications.NotificationStorage;
import com.capacitorjs.plugins.localnotifications.TimedNotificationPublisher;
import java.util.List;

/**
 * Cancels all Capacitor-local-notification alarms (same storage as JS) so background
 * reschedule does not duplicate.
 */
public final class PrayerNotificationHelper {

    private PrayerNotificationHelper() {}

    public static void cancelAllScheduled(Context context) {
        NotificationStorage storage = new NotificationStorage(context);
        List<String> ids = storage.getSavedNotificationIds();
        NotificationManagerCompat nm = NotificationManagerCompat.from(context);
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        for (String idStr : ids) {
            int notificationId;
            try {
                notificationId = Integer.parseInt(idStr);
            } catch (NumberFormatException e) {
                continue;
            }
            nm.cancel(notificationId);

            Intent intent = new Intent(context, TimedNotificationPublisher.class);
            int flags = 0;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags = PendingIntent.FLAG_MUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, notificationId, intent, flags);
            if (alarmManager != null && pi != null) {
                alarmManager.cancel(pi);
            }
            storage.deleteNotification(idStr);
        }
    }

    /**
     * @return true if notifications are enabled (same check as LocalNotificationManager.schedule).
     */
    public static boolean areNotificationsEnabled(Context context) {
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }

    /**
     * Match {@code src/nativePrayerNotifications.ts} channel IDs so {@link PrayerRescheduleWorker} can
     * schedule before the WebView has ever run.
     */
    public static void ensurePrayerChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) {
            return;
        }

        String pkg = context.getPackageName();
        int rawId = context.getResources().getIdentifier("adhan_notify", "raw", pkg);
        Uri soundUri = null;
        if (rawId != 0) {
            soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + pkg + "/" + rawId);
        }

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build();

        // Match Capacitor createChannel importance: 5 (IMPORTANCE_MAX on API 26+).
        NotificationChannel loud = new NotificationChannel(
            "prayer-times-v2",
            "Prayer times",
            NotificationManager.IMPORTANCE_MAX
        );
        loud.setDescription("Alerts when it is time to pray (with sound).");
        loud.enableVibration(true);
        if (soundUri != null) {
            loud.setSound(soundUri, audioAttributes);
        }
        nm.createNotificationChannel(loud);

        NotificationChannel quiet = new NotificationChannel(
            "prayer-times-quiet-v2",
            "Prayer times (quiet)",
            NotificationManager.IMPORTANCE_LOW
        );
        quiet.setDescription("Visual reminder without notification sound.");
        quiet.enableVibration(false);
        quiet.setSound(null, null);
        nm.createNotificationChannel(quiet);
    }
}
