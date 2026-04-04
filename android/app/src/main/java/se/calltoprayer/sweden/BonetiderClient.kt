package se.calltoprayer.sweden

import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import java.io.IOException
import java.util.Locale
import java.util.regex.Pattern

/**
 * Minimal bönetider client (Islamiska förbundet widget) — mirrors src/prayerTimes.ts fetch + parse.
 */
object BonetiderClient {
    private val HTTP = OkHttpClient()

    class PrayerDay(val city: String, val date: String, val schedule: Map<String, String>)

    @Throws(IOException::class)
    fun fetchPrayerTimes(apiFetchUrl: String, cityForWidget: String, dateYmd: String): PrayerDay {
        val formBody: RequestBody = FormBody.Builder()
            .add("ifis_bonetider_widget_city", "$cityForWidget, SE")
            .add("ifis_bonetider_widget_date", dateYmd)
            .build()

        val request = Request.Builder().url(apiFetchUrl).post(formBody).build()

        HTTP.newCall(request).execute().use { response ->
            if (!response.isSuccessful || response.body == null) {
                throw IOException("HTTP ${response.code}")
            }
            val html = response.body!!.string()
            val schedule = extractPrayerTimesFromWidgetHtml(html)
            return PrayerDay(cityForWidget, dateYmd, schedule)
        }
    }

    @Throws(IOException::class)
    private fun extractPrayerTimesFromWidgetHtml(html: String): Map<String, String> {
        val trimmed = html.trim()
        if (trimmed.length < 20 || !trimmed.lowercase(Locale.US).contains("<li") || trimmed.replace("(?s).*<ul[^>]*>\\s*</ul>.*".toRegex(), "").isEmpty()) {
            throw IOException("PRAYER_TIMES_EMPTY")
        }

        val liPattern = Pattern.compile("<li\\b[^>]*>[\\s\\S]*?</li>", Pattern.CASE_INSENSITIVE)
        val liMatcher = liPattern.matcher(trimmed)

        val out = mutableMapOf<String, String>()

        while (liMatcher.find()) {
            val li = liMatcher.group()
            var timeMatch = Pattern.compile("<span[^>]*>\\s*(\\d{2}:\\d{2})\\s*</span>", Pattern.CASE_INSENSITIVE).matcher(li)
            if (!timeMatch.find()) {
                timeMatch = Pattern.compile("\\b(\\d{2}:\\d{2})\\b").matcher(li)
                if (!timeMatch.find()) continue
            }
            val time = timeMatch.group(1)

            val text = li.replace("<[^>]*>".toRegex(), " ")
            val label = text.replace("\\d{2}:\\d{2}".toRegex(), " ")
                .replace("[—–-]+".toRegex(), " ")
                .replace("\\s+".toRegex(), " ")
                .trim()

            val key = prayerKeyFromLabel(label)
            if (key != null && !out.containsKey(key)) {
                out[key] = time!!
            }
        }

        if (out["fajr"] != null &&
            out["sunrise"] != null &&
            out["dhuhr"] != null &&
            out["asr"] != null &&
            out["maghrib"] != null &&
            out["isha"] != null
        ) {
            return out
        }
        throw IOException("PRAYER_TIMES_PARSE")
    }

    private fun prayerKeyFromLabel(label: String): String? {
        var l = label.lowercase(Locale.forLanguageTag("sv"))
        l = l.replace("'", "").replace("’", "").replace("\\s+".toRegex(), " ").trim()
        if (l.contains("fajr")) return "fajr"
        if (l.contains("shuruk") || l.contains("shuruq") || l.contains("sunrise") || l.contains("soluppgang")) return "sunrise"
        if (l.contains("dhohr") || l.contains("dhuhr") || l.contains("zuhr") || l.contains("zohor") || l.contains("middag")) return "dhuhr"
        if (l.contains("asr")) return "asr"
        if (l.contains("magrib") || l.contains("maghrib")) return "maghrib"
        if (l.contains("isha")) return "isha"
        return null
    }
}
