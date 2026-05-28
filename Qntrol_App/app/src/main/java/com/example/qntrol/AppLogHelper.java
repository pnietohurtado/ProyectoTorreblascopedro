package com.example.qntrol;

import android.content.Context;
import android.os.Build;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public final class AppLogHelper {

    private static final String PREFS_NAME = "AppLogs";
    private static final String KEY_LOGS = "logs";
    private static final String ENTRY_SEPARATOR = "\n---\n";
    private static final int MAX_LOG_ENTRIES = 200;
    private static final long LOG_RETENTION_MS = 30L * 24L * 60L * 60L * 1000L;

    private AppLogHelper() {}

    public static void logUserEntered(Context context, String email) {
        String safeEmail = email != null && !email.trim().isEmpty()
                ? email.trim()
                : context.getString(R.string.log_unknown_user);
        addLog(context, context.getString(R.string.log_user_entered_app, safeEmail, getDeviceName()));
    }

    public static void logEntryAccepted(Context context, String guestLabel, String ownerName, String source) {
        addLog(context, context.getString(
                R.string.log_guest_entry_accepted,
                getDeviceName(),
                safeValue(context, guestLabel, R.string.generic_guest_name),
                safeValue(context, ownerName, R.string.feedback_unknown_guest),
                source
        ));
    }

    public static List<String> getLogs(Context context) {
        String rawLogs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_LOGS, "");
        if (rawLogs == null || rawLogs.trim().isEmpty()) {
            return new ArrayList<>();
        }
        List<String> logs = new ArrayList<>(Arrays.asList(rawLogs.split(ENTRY_SEPARATOR)));
        List<String> freshLogs = removeExpiredLogs(logs);
        if (freshLogs.size() != logs.size()) {
            saveLogs(context, freshLogs);
        }
        return freshLogs;
    }

    public static void clearLogs(Context context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_LOGS)
                .apply();
    }

    private static void addLog(Context context, String message) {
        List<String> logs = getLogs(context);
        String timestamp = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault()).format(new Date());
        logs.add(0, timestamp + " - " + message);

        if (logs.size() > MAX_LOG_ENTRIES) {
            logs = new ArrayList<>(logs.subList(0, MAX_LOG_ENTRIES));
        }

        saveLogs(context, logs);
    }

    private static void saveLogs(Context context, List<String> logs) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_LOGS, joinLogs(logs))
                .apply();
    }

    private static List<String> removeExpiredLogs(List<String> logs) {
        List<String> freshLogs = new ArrayList<>();
        long now = System.currentTimeMillis();

        for (String log : logs) {
            Long timestamp = parseLogTimestamp(log);
            if (timestamp == null || now - timestamp <= LOG_RETENTION_MS) {
                freshLogs.add(log);
            }
        }

        return freshLogs;
    }

    private static Long parseLogTimestamp(String log) {
        if (log == null || log.length() < 19) return null;

        try {
            Date date = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())
                    .parse(log.substring(0, 19));
            return date != null ? date.getTime() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static String joinLogs(List<String> logs) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < logs.size(); i++) {
            if (i > 0) {
                builder.append(ENTRY_SEPARATOR);
            }
            builder.append(logs.get(i));
        }
        return builder.toString();
    }

    private static String getDeviceName() {
        String manufacturer = Build.MANUFACTURER != null ? Build.MANUFACTURER : "";
        String model = Build.MODEL != null ? Build.MODEL : "";

        if (model.toLowerCase(Locale.ROOT).startsWith(manufacturer.toLowerCase(Locale.ROOT))) {
            return capitalize(model);
        }
        return (capitalize(manufacturer) + " " + model).trim();
    }

    private static String capitalize(String value) {
        if (value == null || value.isEmpty()) return "";
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1);
    }

    private static String safeValue(Context context, String value, int fallbackResId) {
        return value != null && !value.trim().isEmpty()
                ? value.trim()
                : context.getString(fallbackResId);
    }
}
