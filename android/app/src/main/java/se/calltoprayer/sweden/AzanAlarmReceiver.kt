package se.calltoprayer.sweden

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class AzanAlarmReceiver : BroadcastReceiver() {

    companion object {
        const val EXTRA_AUDIO_URL = "audioUrl"
        const val EXTRA_VOLUME = "volume"
        const val EXTRA_KEY = "key"
        private const val TAG = "AzanAlarmReceiver"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val url = intent?.getStringExtra(EXTRA_AUDIO_URL) ?: return
        val volume = intent.getFloatExtra(EXTRA_VOLUME, 0.92f)
        val key = intent.getStringExtra(EXTRA_KEY) ?: ""
        Log.d(TAG, "alarm for prayer=$key url=${url.take(48)}…")
        val svc = Intent(context, AzanPlaybackService::class.java).apply {
            putExtra(AzanPlaybackService.EXTRA_AUDIO_URL, url)
            putExtra(AzanPlaybackService.EXTRA_VOLUME, volume)
            putExtra(AzanPlaybackService.EXTRA_KEY, key)
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(svc)
            } else {
                context.startService(svc)
            }
        } catch (e: Exception) {
            Log.e(TAG, "startForegroundService failed", e)
        }
    }
}
