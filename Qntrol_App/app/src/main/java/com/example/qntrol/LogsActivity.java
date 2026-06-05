package com.example.qntrol;

import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import java.util.List;

public class LogsActivity extends AppCompatActivity {

    private LinearLayout layoutLogsContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ThemeHelper.applyTheme(this);
        LanguageHelper.applyLanguage(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_logs);

        layoutLogsContainer = findViewById(R.id.layoutLogsContainer);

        findViewById(R.id.btnBackLogs).setOnClickListener(v -> finish());

        renderLogs();
    }

    private void renderLogs() {
        List<String> logs = AppLogHelper.getLogs(this);
        layoutLogsContainer.removeAllViews();

        boolean hasLogs = !logs.isEmpty();

        if (!hasLogs) {
            TextView emptyView = createLogTextView(getString(R.string.logs_empty));
            emptyView.setGravity(Gravity.CENTER);
            layoutLogsContainer.addView(emptyView);
            return;
        }

        for (String log : logs) {
            TextView logView = createLogTextView(log);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
            );
            params.setMargins(0, 0, 0, dpToPx(10));
            layoutLogsContainer.addView(logView, params);
        }
    }

    private TextView createLogTextView(String text) {
        TextView logView = new TextView(this);
        logView.setText(text);
        logView.setTextColor(resolveThemeColor(android.R.attr.textColorPrimary));
        logView.setTextSize(13);
        logView.setLineSpacing(2f, 1f);
        logView.setBackgroundResource(R.drawable.bg_log_item);
        int padding = dpToPx(14);
        logView.setPadding(padding, padding, padding, padding);
        return logView;
    }

    private int dpToPx(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    private int resolveThemeColor(int attr) {
        TypedValue typedValue = new TypedValue();
        getTheme().resolveAttribute(attr, typedValue, true);
        if (typedValue.resourceId != 0) {
            return ContextCompat.getColor(this, typedValue.resourceId);
        }
        return typedValue.data;
    }
}
