package se.calltoprayer.sweden

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.getcapacitor.BridgeActivity
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "BatteryOptimization")
class BatteryOptimizationPlugin : Plugin() {
    @PluginMethod
    fun openSettings(call: PluginCall) {
        openAppDetailsInternal()
        call.resolve()
    }

    /** Opens this app’s page in system settings (Battery → Unrestricted, etc.). */
    @PluginMethod
    fun openAppDetailsSettings(call: PluginCall) {
        openAppDetailsInternal()
        call.resolve()
    }

    private fun openAppDetailsInternal() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e("BatteryOptimization", "openAppDetailsSettings", e)
        }
    }

    /** Opens notification settings for this app (Android 8+). */
    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                    putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            } else {
                openAppDetailsInternal()
            }
        } catch (e: Exception) {
            Log.e("BatteryOptimization", "openNotificationSettings", e)
            openAppDetailsInternal()
        }
        call.resolve()
    }

    @PluginMethod
    fun isIgnoringBatteryOptimizations(call: PluginCall) {
        Log.d("BatteryOptimization", "Checking battery optimization status...")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(android.content.Context.POWER_SERVICE) as android.os.PowerManager
            val isIgnoring = pm.isIgnoringBatteryOptimizations(context.packageName)
            Log.d("BatteryOptimization", "isIgnoring: $isIgnoring")
            val ret = com.getcapacitor.JSObject()
            ret.put("isIgnoring", isIgnoring)
            call.resolve(ret)
        } else {
            val ret = com.getcapacitor.JSObject()
            ret.put("isIgnoring", true)
            call.resolve(ret)
        }
    }
}

/**
 * Capacitor host: the visible UI (prayer times, settings, calendar) is the web app in
 * `app/src/main/assets/public/` inside a WebView — not separate XML/Compose screens.
 */
class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        registerPlugin(BatteryOptimizationPlugin::class.java)
        registerPlugin(NativeAzanPlugin::class.java)
        super.onCreate(savedInstanceState)
        PrayerScheduleBootstrap.register(this)
        clearWebViewDiskCacheInDebugBuilds()
    }

    /** Debug builds only: avoid stale WebView cache after rebuilding web assets. */
    private fun clearWebViewDiskCacheInDebugBuilds() {
        val debug = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        if (!debug) return
        try {
            bridge?.getWebView()?.clearCache(true)
        } catch (e: Exception) {
            Log.w("MainActivity", "clearCache (debug)", e)
        }
    }
}
