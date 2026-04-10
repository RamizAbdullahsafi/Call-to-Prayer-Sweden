package se.calltoprayer.sweden

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Plays azan in the foreground from [R.raw] ([RAW_ASSET_PREFIX] + basename) or legacy [LEGACY_BUNDLED_URL].
 */
class AzanPlaybackService : Service() {

    companion object {
        /** Must match `RAW_ASSET_PREFIX` in TypeScript (`azan.ts`). */
        const val RAW_ASSET_PREFIX = "asset://raw/"

        /** Older scheduled alarms used this; same audio as `beautiful_adhan`. */
        const val LEGACY_BUNDLED_URL = "asset://bundled-adhan"

        const val EXTRA_AUDIO_URL = "audioUrl"
        const val EXTRA_VOLUME = "volume"
        const val EXTRA_KEY = "key"

        private const val TAG = "AzanPlaybackService"
        private const val CHANNEL_ID = "ctp-azan-playback-v1"
        private const val NOTIF_ID = 91001
    }

    private var player: MediaPlayer? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val url = intent?.getStringExtra(EXTRA_AUDIO_URL)
        if (url.isNullOrBlank()) {
            stopSelf()
            return START_NOT_STICKY
        }
        val volume = intent.getFloatExtra(EXTRA_VOLUME, 0.92f).coerceIn(0f, 1f)
        val key = intent.getStringExtra(EXTRA_KEY) ?: ""

        ensureChannel()
        val launch = packageManager.getLaunchIntentForPackage(packageName)
        val contentPi = PendingIntent.getActivity(
            this,
            0,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag()
        )
        val notif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.azan_playback_title))
            .setContentText(getString(R.string.azan_playback_body, key))
            .setSmallIcon(R.drawable.ic_masjid_foreground)
            .setContentIntent(contentPi)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIF_ID,
                notif,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            )
        } else {
            startForeground(NOTIF_ID, notif)
        }

        releasePlayer()
        try {
            val mp = MediaPlayer()
            player = mp
            mp.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            when {
                url.startsWith(RAW_ASSET_PREFIX) -> {
                    val name = url.removePrefix(RAW_ASSET_PREFIX)
                    val resId = resources.getIdentifier(name, "raw", packageName)
                    if (resId == 0) {
                        Log.e(TAG, "Missing raw resource: $name")
                        throw IllegalArgumentException("raw/$name")
                    }
                    resources.openRawResourceFd(resId).use { afd ->
                        mp.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                    }
                }
                url == LEGACY_BUNDLED_URL -> {
                    val resId = resources.getIdentifier("beautiful_adhan", "raw", packageName)
                    if (resId == 0) {
                        Log.e(TAG, "Missing beautiful_adhan raw")
                        throw IllegalArgumentException("raw/beautiful_adhan")
                    }
                    resources.openRawResourceFd(resId).use { afd ->
                        mp.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                    }
                }
                else -> mp.setDataSource(url)
            }
            mp.setOnPreparedListener { p ->
                try {
                    p.setVolume(volume, volume)
                    p.start()
                } catch (e: Exception) {
                    Log.e(TAG, "start()", e)
                    stopPlayback()
                }
            }
            mp.setOnCompletionListener {
                stopPlayback()
            }
            mp.setOnErrorListener { _, what, extra ->
                Log.e(TAG, "MediaPlayer error what=$what extra=$extra")
                stopPlayback()
                true
            }
            mp.prepareAsync()
        } catch (e: Exception) {
            Log.e(TAG, "MediaPlayer setup failed", e)
            stopPlayback()
        }
        return START_NOT_STICKY
    }

    private fun immutableFlag(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE
        } else {
            0
        }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java) ?: return
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val ch = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.azan_playback_channel_name),
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = getString(R.string.azan_playback_channel_desc)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        nm.createNotificationChannel(ch)
    }

    private fun releasePlayer() {
        try {
            player?.release()
        } catch (_: Exception) {
        }
        player = null
    }

    private fun stopPlayback() {
        releasePlayer()
        try {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } catch (_: Exception) {
        }
        stopSelf()
    }

    override fun onDestroy() {
        releasePlayer()
        super.onDestroy()
    }
}
