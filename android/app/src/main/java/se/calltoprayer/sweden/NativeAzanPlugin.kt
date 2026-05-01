package se.calltoprayer.sweden

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray

/**
 * JS entry point to sync exact alarms for full azan playback (Android).
 */
@CapacitorPlugin(name = "NativeAzan")
class NativeAzanPlugin : Plugin() {

    @PluginMethod
    @Suppress("unused")
    fun sync(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: false
        val volume = call.getFloat("volume") ?: 0.92f
        if (!enabled) {
            AzanAlarmScheduler.cancelAll(context)
            call.resolve()
            return
        }
        val arr: JSONArray = call.getArray("alarms", JSArray()) ?: JSArray()
        AzanAlarmScheduler.scheduleFromJs(context, volume, arr)
        call.resolve()
    }

    @PluginMethod
    @Suppress("unused")
    fun verifyRawAssets(call: PluginCall) {
        val files = call.getArray("files", JSArray()) ?: JSArray()
        val missing = JSArray()
        for (i in 0 until files.length()) {
            val rawFile = files.optString(i, "").trim()
            if (rawFile.isEmpty()) continue
            val base = rawFile.substringBeforeLast('.')
            if (base.isEmpty()) continue
            val resId = context.resources.getIdentifier(base, "raw", context.packageName)
            if (resId == 0) {
                missing.put(rawFile)
            }
        }
        call.resolve(JSObject().apply {
            put("missing", missing)
        })
    }
}
