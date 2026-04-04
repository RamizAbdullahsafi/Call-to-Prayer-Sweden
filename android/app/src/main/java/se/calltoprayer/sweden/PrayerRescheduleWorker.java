package se.calltoprayer.sweden;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import com.capacitorjs.plugins.localnotifications.LocalNotification;
import com.capacitorjs.plugins.localnotifications.LocalNotificationManager;
import com.capacitorjs.plugins.localnotifications.LocalNotificationSchedule;
import com.capacitorjs.plugins.localnotifications.NotificationStorage;
import com.getcapacitor.CapConfig;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Refreshes prayer notifications from persisted JS config (Capacitor Preferences) + bönetider API.
 */
public class PrayerRescheduleWorker extends Worker {

    private static final String PREFS = "CapacitorStorage";
    private static final String CONFIG_KEY = "ctp.prayerScheduleConfig.v1";

    private static final String CHANNEL_LOUD = "prayer-times-v2";
    private static final String CHANNEL_QUIET = "prayer-times-quiet-v2";

    private static final String[] KEY_ORDER = { "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha" };

    public PrayerRescheduleWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(CONFIG_KEY, null);
        if (raw == null || raw.isEmpty()) {
            return Result.success();
        }

        JSONObject cfg;
        try {
            cfg = new JSONObject(raw);
        } catch (JSONException e) {
            return Result.success();
        }

        String apiFetchUrl = cfg.optString("apiFetchUrl", "");
        if (apiFetchUrl.isEmpty()) {
            Logger.debug(Logger.tags("CTP"), "PrayerRescheduleWorker: no absolute apiFetchUrl — skip");
            return Result.success();
        }

        String city = cfg.optString("city", "");
        if (city.isEmpty()) {
            return Result.success();
        }

        boolean silent = cfg.optBoolean("notificationSilent", false);
        String title = cfg.optString("title", "Prayer Sweden");
        int daysAhead = cfg.optInt("daysAhead", 60);

        JSONArray keysJson = cfg.optJSONArray("keys");
        if (keysJson == null || keysJson.length() == 0) {
            return Result.success();
        }

        JSONObject labels = cfg.optJSONObject("labels");

        if (!PrayerNotificationHelper.areNotificationsEnabled(ctx)) {
            return Result.success();
        }

        PrayerNotificationHelper.ensurePrayerChannels(ctx);

        NotificationStorage storage = new NotificationStorage(ctx);
        LocalNotificationManager manager = new LocalNotificationManager(storage, null, ctx, CapConfig.loadDefault(ctx));

        Date now = new Date();
        List<LocalNotification> notifications = new ArrayList<>();

        Calendar dayCursor = Calendar.getInstance();
        for (int offset = 0; offset < daysAhead; offset++) {
            if (offset > 0) {
                dayCursor.add(Calendar.DAY_OF_MONTH, 1);
            }
            String ymd = formatYmd(dayCursor);

            BonetiderClient.PrayerDay day;
            try {
                day = BonetiderClient.fetchPrayerTimes(apiFetchUrl, city, ymd);
            } catch (Exception e) {
                Logger.warn(Logger.tags("CTP"), "fetch failed " + ymd + ": " + e.getMessage());
                continue;
            }

            for (int ki = 0; ki < keysJson.length(); ki++) {
                try {
                    String key = keysJson.getString(ki);
                    String timeStr = day.schedule.get(key);
                    if (timeStr == null) continue;

                    Date at = prayerInstantLocal(ymd, timeStr);
                    if (at.getTime() <= now.getTime()) continue;

                    String label = labels != null ? labels.optString(key, key) : key;
                    String body = label + " (" + timeStr + ")";

                    int id = nativeNotificationId(ymd, key);
                    String channelId = silent ? CHANNEL_QUIET : CHANNEL_LOUD;

                    JSObject json = new JSObject();
                    json.put("id", id);
                    json.put("title", title);
                    json.put("body", body);
                    json.put("channelId", channelId);
                    JSObject sched = new JSObject();
                    sched.put("at", formatUtcIso(at));
                    sched.put("allowWhileIdle", true);
                    json.put("schedule", sched);
                    JSObject extra = new JSObject();
                    extra.put("ctp", true);
                    extra.put("key", key);
                    json.put("extra", extra);

                    LocalNotification ln = LocalNotification.buildNotificationFromJSObject(json);
                    notifications.add(ln);
                } catch (JSONException | ParseException e) {
                    Logger.warn(Logger.tags("CTP"), "build notification: " + e.getMessage());
                }
            }
        }

        if (notifications.isEmpty()) {
            return Result.success();
        }

        // Only clear old notifications if we successfully fetched new ones to replace them.
        // This keeps the app working offline if a background refresh fails.
        PrayerNotificationHelper.cancelAllScheduled(ctx);

        final int chunk = 40;
        try {
            for (int i = 0; i < notifications.size(); i += chunk) {
                int end = Math.min(i + chunk, notifications.size());
                List<LocalNotification> part = notifications.subList(i, end);
                manager.schedule(null, new ArrayList<>(part));
            }
        } catch (Exception e) {
            Logger.error(Logger.tags("CTP"), "schedule failed", e);
            return Result.failure();
        }

        return Result.success();
    }

    private static String formatYmd(Calendar cal) {
        int y = cal.get(Calendar.YEAR);
        int m = cal.get(Calendar.MONTH) + 1;
        int d = cal.get(Calendar.DAY_OF_MONTH);
        return String.format(Locale.US, "%04d-%02d-%02d", y, m, d);
    }

    private static Date prayerInstantLocal(String dateYmd, String hhmm) throws ParseException {
        String[] ymd = dateYmd.split("-");
        String[] hm = hhmm.split(":");
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.YEAR, Integer.parseInt(ymd[0]));
        cal.set(Calendar.MONTH, Integer.parseInt(ymd[1]) - 1);
        cal.set(Calendar.DAY_OF_MONTH, Integer.parseInt(ymd[2]));
        cal.set(Calendar.HOUR_OF_DAY, Integer.parseInt(hm[0]));
        cal.set(Calendar.MINUTE, Integer.parseInt(hm[1]));
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTime();
    }

    private static int nativeNotificationId(String dateYmd, String key) {
        int dayPart = Integer.parseInt(dateYmd.replace("-", "")) % 100000;
        int idx = 0;
        for (int i = 0; i < KEY_ORDER.length; i++) {
            if (KEY_ORDER[i].equals(key)) {
                idx = i;
                break;
            }
        }
        return dayPart * 10 + idx;
    }

    private static String formatUtcIso(Date date) {
        SimpleDateFormat sdf = new SimpleDateFormat(LocalNotificationSchedule.JS_DATE_FORMAT, Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(date);
    }
}
