package se.calltoprayer.sweden;

import java.io.IOException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Minimal bönetider client (Islamiska förbundet widget) — mirrors src/prayerTimes.ts fetch + parse.
 */
public final class BonetiderClient {

    private static final OkHttpClient HTTP = new OkHttpClient();

    private BonetiderClient() {}

    public static class PrayerDay {
        public final String city;
        public final String date;
        public final Map<String, String> schedule;

        public PrayerDay(String city, String date, Map<String, String> schedule) {
            this.city = city;
            this.date = date;
            this.schedule = schedule;
        }
    }

    public static PrayerDay fetchPrayerTimes(String apiFetchUrl, String cityForWidget, String dateYmd)
        throws IOException {
        RequestBody formBody = new FormBody.Builder()
            .add("ifis_bonetider_widget_city", cityForWidget + ", SE")
            .add("ifis_bonetider_widget_date", dateYmd)
            .build();

        Request request = new Request.Builder().url(apiFetchUrl).post(formBody).build();

        try (Response response = HTTP.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new IOException("HTTP " + response.code());
            }
            String html = response.body().string();
            Map<String, String> schedule = extractPrayerTimesFromWidgetHtml(html);
            return new PrayerDay(cityForWidget, dateYmd, schedule);
        }
    }

    private static Map<String, String> extractPrayerTimesFromWidgetHtml(String html) throws IOException {
        String trimmed = html.trim();
        if (trimmed.length() < 20 || !trimmed.toLowerCase(Locale.US).contains("<li") || trimmed.matches("(?s).*<ul[^>]*>\\s*</ul>.*")) {
            throw new IOException("PRAYER_TIMES_EMPTY");
        }

        Pattern liPattern = Pattern.compile("<li\\b[^>]*>[\\s\\S]*?</li>", Pattern.CASE_INSENSITIVE);
        Matcher liMatcher = liPattern.matcher(trimmed);

        Map<String, String> out = new HashMap<>();

        while (liMatcher.find()) {
            String li = liMatcher.group();
            Matcher timeMatch = Pattern.compile("<span[^>]*>\\s*(\\d{2}:\\d{2})\\s*</span>", Pattern.CASE_INSENSITIVE).matcher(li);
            if (!timeMatch.find()) {
                timeMatch = Pattern.compile("\\b(\\d{2}:\\d{2})\\b").matcher(li);
                if (!timeMatch.find()) continue;
            }
            String time = timeMatch.group(1);

            String text = li.replaceAll("<[^>]*>", " ");
            String label = text.replaceAll("\\d{2}:\\d{2}", " ").replaceAll("[—–-]+", " ").replaceAll("\\s+", " ").trim();

            String key = prayerKeyFromLabel(label);
            if (key != null && !out.containsKey(key)) {
                out.put(key, time);
            }
        }

        if (
            out.get("fajr") != null &&
            out.get("sunrise") != null &&
            out.get("dhuhr") != null &&
            out.get("asr") != null &&
            out.get("maghrib") != null &&
            out.get("isha") != null
        ) {
            return out;
        }
        throw new IOException("PRAYER_TIMES_PARSE");
    }

    private static String prayerKeyFromLabel(String label) {
        String l = label.toLowerCase(Locale.forLanguageTag("sv"));
        l = l.replace("'", "").replace("’", "").replaceAll("\\s+", " ").trim();
        if (l.contains("fajr")) return "fajr";
        if (l.contains("shuruk") || l.contains("shuruq") || l.contains("sunrise") || l.contains("soluppgang")) return "sunrise";
        if (
            l.contains("dhohr") ||
            l.contains("dhuhr") ||
            l.contains("zuhr") ||
            l.contains("zohor") ||
            l.contains("middag")
        ) return "dhuhr";
        if (l.contains("asr")) return "asr";
        if (l.contains("magrib") || l.contains("maghrib")) return "maghrib";
        if (l.contains("isha")) return "isha";
        return null;
    }
}
