package se.calltoprayer.sweden

import android.content.SharedPreferences
import org.json.JSONObject

/**
 * Reads prayer-day cache mirrored from JS ([prayerTimes.ts] → Capacitor Preferences / [CapacitorStorage]).
 * Keys: `ctp.prayer.cache.v1:<city>:<yyyy-MM-dd>`.
 */
object PrayerDayCache {

    private const val PREFIX = "ctp.prayer.cache.v1"

    fun cacheKey(city: String, dateYmd: String): String = "$PREFIX:$city:$dateYmd"

    fun load(prefs: SharedPreferences, city: String, dateYmd: String): BonetiderClient.PrayerDay? {
        val raw = prefs.getString(cacheKey(city, dateYmd), null) ?: return null
        return try {
            val root = JSONObject(raw)
            val dayObj = root.getJSONObject("day")
            val cityOut = dayObj.getString("city")
            val dateOut = dayObj.getString("date")
            val schedObj = dayObj.getJSONObject("schedule")
            val map = mutableMapOf<String, String>()
            for (k in listOf("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha")) {
                if (!schedObj.has(k)) return null
                map[k] = schedObj.getString(k)
            }
            BonetiderClient.PrayerDay(cityOut, dateOut, map)
        } catch (_: Exception) {
            null
        }
    }
}
