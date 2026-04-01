package se.calltoprayer.sweden;

import android.content.Context;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

/**
 * Registers daily + opportunistic refresh of prayer alarms (after boot, JS has saved config).
 */
public final class PrayerScheduleBootstrap {

    private static final String ONESHOT = "ctp-prayer-reschedule-once";
    private static final String PERIODIC = "ctp-prayer-reschedule-daily";

    private PrayerScheduleBootstrap() {}

    /** Call from {@link MainActivity#onCreate} after super. */
    public static void register(Context context) {
        Constraints network = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();

        PeriodicWorkRequest periodic = new PeriodicWorkRequest.Builder(PrayerRescheduleWorker.class, 24, TimeUnit.HOURS)
            .setConstraints(network)
            .build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, periodic);
    }

    /** After reboot; also safe to call multiple times. */
    public static void enqueueOneShot(Context context) {
        Constraints network = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();

        OneTimeWorkRequest once = new OneTimeWorkRequest.Builder(PrayerRescheduleWorker.class).setConstraints(network).build();

        WorkManager.getInstance(context).enqueueUniqueWork(ONESHOT, ExistingWorkPolicy.REPLACE, once);
    }
}
