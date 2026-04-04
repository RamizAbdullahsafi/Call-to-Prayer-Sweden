package se.calltoprayer.sweden

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Re-schedule prayer notifications after reboot or app update when network is available.
 */
class PrayerBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == null) return
        val action = intent.action
        if (Intent.ACTION_BOOT_COMPLETED == action || Intent.ACTION_MY_PACKAGE_REPLACED == action) {
            PrayerScheduleBootstrap.enqueueOneShot(context.applicationContext)
        }
    }
}
