package se.calltoprayer.sweden

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequest
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * Registers daily + opportunistic refresh of prayer alarms (after boot, JS has saved config).
 */
object PrayerScheduleBootstrap {
    private const val ONESHOT = "ctp-prayer-reschedule-once"
    private const val PERIODIC = "ctp-prayer-reschedule-daily"

    /** Call from [MainActivity.onCreate] after super. */
    @JvmStatic
    fun register(context: Context) {
        // No network required: [PrayerRescheduleWorker] falls back to mirrored prayer cache when offline
        // so notifications and native azan alarms stay in sync (same as when online).
        val periodic = PeriodicWorkRequest.Builder(PrayerRescheduleWorker::class.java, 24, TimeUnit.HOURS)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC,
            ExistingPeriodicWorkPolicy.UPDATE,
            periodic
        )
    }

    /** After reboot; also safe to call multiple times. */
    @JvmStatic
    fun enqueueOneShot(context: Context) {
        val once = OneTimeWorkRequest.Builder(PrayerRescheduleWorker::class.java).build()

        WorkManager.getInstance(context).enqueueUniqueWork(ONESHOT, ExistingWorkPolicy.REPLACE, once)
    }
}
