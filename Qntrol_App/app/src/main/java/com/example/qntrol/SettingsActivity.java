package com.example.qntrol;

import android.content.Intent;
import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.widget.TextView;
import android.view.Window;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.materialswitch.MaterialSwitch;
import com.google.firebase.auth.FirebaseAuth;
import android.view.View;
import android.view.ViewGroup;

public class SettingsActivity extends AppCompatActivity {

    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ThemeHelper.applyTheme(this);
        LanguageHelper.applyLanguage(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        mAuth = FirebaseAuth.getInstance();

        // Check if we should hide logout button (e.g. opened from Login screen)
        boolean hideLogout = getIntent().getBooleanExtra("HIDE_LOGOUT", false);
        if (hideLogout) {
            findViewById(R.id.btnLogout).setVisibility(View.GONE);
        }

        // UI References
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        
        MaterialSwitch switchTheme = findViewById(R.id.switchTheme);
        MaterialSwitch switchScanMode = findViewById(R.id.switchScanMode);
        TextView tvScanModeTitle = findViewById(R.id.tvScanModeTitle);
        
        // Setup Theme Switch
        int currentTheme = ThemeHelper.getSelectedTheme(this);
        switchTheme.setChecked(currentTheme == ThemeHelper.THEME_DARK);
        switchTheme.setOnCheckedChangeListener((buttonView, isChecked) -> {
            ThemeHelper.setTheme(this, isChecked ? ThemeHelper.THEME_DARK : ThemeHelper.THEME_LIGHT);
            recreate();
        });

        boolean isAutoMode = getSharedPreferences("QrSettings", MODE_PRIVATE)
                .getBoolean("auto_mode", true);
        switchScanMode.setChecked(isAutoMode);
        updateScanModeTitle(tvScanModeTitle, isAutoMode);
        switchScanMode.setOnCheckedChangeListener((buttonView, isChecked) -> {
            getSharedPreferences("QrSettings", MODE_PRIVATE)
                    .edit()
                    .putBoolean("auto_mode", isChecked)
                    .apply();
            updateScanModeTitle(tvScanModeTitle, isChecked);
        });
        findViewById(R.id.cardScanMode).setOnClickListener(v ->
                switchScanMode.setChecked(!switchScanMode.isChecked()));

        findViewById(R.id.cardLogs).setOnClickListener(v ->
                startActivity(new Intent(this, LogsActivity.class)));

        findViewById(R.id.cardFaq).setOnClickListener(v ->
                startActivity(new Intent(this, FaqActivity.class)));

        // Setup Privacy Card
        findViewById(R.id.cardPrivacy).setOnClickListener(v -> showPrivacyDialog());

        // Setup Logout Button
        findViewById(R.id.btnLogout).setOnClickListener(v -> showLogoutConfirmation());
    }

    private void showLogoutConfirmation() {
        showSettingsDialog(
                getString(R.string.logout_confirm_title),
                getString(R.string.logout_confirm_msg),
                getString(R.string.btn_cancel),
                getString(R.string.btn_logout_confirm),
                () -> {
                    mAuth.signOut();
                    Intent intent = new Intent(this, Login.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(intent);
                    finish();
                }
        );
    }

    private void updateScanModeTitle(TextView tv, boolean isAutoMode) {
        tv.setText(isAutoMode ? R.string.scan_mode_auto : R.string.scan_mode_manual);
    }

    private void showPrivacyDialog() {
        showSettingsDialog(
                getString(R.string.privacy_policy_title),
                getString(R.string.privacy_policy_content),
                null,
                getString(R.string.btn_close),
                null
        );
    }

    private void showSettingsDialog(String title, String message, String cancelText, String confirmText, Runnable onConfirm) {
        Dialog dialog = new Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_settings_message);

        Window window = dialog.getWindow();
        if (window != null) {
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        }

        TextView tvTitle = dialog.findViewById(R.id.tvDialogTitle);
        TextView tvMessage = dialog.findViewById(R.id.tvDialogMessage);
        MaterialButton btnCancel = dialog.findViewById(R.id.btnDialogCancel);
        MaterialButton btnConfirm = dialog.findViewById(R.id.btnDialogConfirm);

        tvTitle.setText(title);
        tvMessage.setText(message);
        btnConfirm.setText(confirmText);

        if (cancelText == null) {
            btnCancel.setVisibility(View.GONE);
        } else {
            btnCancel.setText(cancelText);
            btnCancel.setOnClickListener(v -> dialog.dismiss());
        }

        btnConfirm.setOnClickListener(v -> {
            dialog.dismiss();
            if (onConfirm != null) {
                onConfirm.run();
            }
        });

        dialog.show();
        Window shownWindow = dialog.getWindow();
        if (shownWindow != null) {
            shownWindow.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        }
    }
}
