package se.calltoprayer.sweden;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Re-schedule prayer notifications after reboot or app update when network is available.
 */
public class PrayerBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            PrayerScheduleBootstrap.enqueueOneShot(context.getApplicationContext());
        }
    }
}
