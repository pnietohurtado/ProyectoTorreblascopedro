package com.example.qntrol;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.materialswitch.MaterialSwitch;
import com.google.firebase.auth.FirebaseAuth;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import android.view.View;

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
        TextView tvCurrentLang = findViewById(R.id.tvCurrentLang);
        
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

        // Setup Language Card
        String currentLang = LanguageHelper.getSelectedLanguage(this);
        tvCurrentLang.setText(currentLang.equals(LanguageHelper.LANG_ES) ? getString(R.string.lang_spanish) : getString(R.string.lang_english));
        
        findViewById(R.id.cardLanguage).setOnClickListener(v -> showLanguageDialog());

        // Setup Privacy Card
        findViewById(R.id.cardPrivacy).setOnClickListener(v -> showPrivacyDialog());

        // Setup Logout Button
        findViewById(R.id.btnLogout).setOnClickListener(v -> showLogoutConfirmation());
    }

    private void showLogoutConfirmation() {
        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.logout_confirm_title)
                .setMessage(R.string.logout_confirm_msg)
                .setPositiveButton(R.string.btn_logout_confirm, (dialog, which) -> {
                    mAuth.signOut();
                    Intent intent = new Intent(this, Login.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(intent);
                    finish();
                })
                .setNegativeButton(R.string.btn_cancel, null)
                .show();
    }

    private void updateScanModeTitle(TextView tv, boolean isAutoMode) {
        tv.setText(isAutoMode ? R.string.scan_mode_auto : R.string.scan_mode_manual);
    }

    private void showLanguageDialog() {
        String[] languages = {getString(R.string.lang_spanish), getString(R.string.lang_english)};
        int checkedItem = LanguageHelper.getSelectedLanguage(this).equals(LanguageHelper.LANG_ES) ? 0 : 1;

        new AlertDialog.Builder(this)
                .setTitle(R.string.setting_language)
                .setSingleChoiceItems(languages, checkedItem, (dialog, which) -> {
                    String selectedLang = (which == 0) ? LanguageHelper.LANG_ES : LanguageHelper.LANG_EN;
                    LanguageHelper.setLanguage(this, selectedLang);
                    dialog.dismiss();
                    recreate();
                })
                .show();
    }

    private void showPrivacyDialog() {
        new AlertDialog.Builder(this)
                .setTitle(R.string.privacy_policy_title)
                .setMessage(R.string.privacy_policy_content)
                .setPositiveButton(R.string.btn_close, (dialog, which) -> dialog.dismiss())
                .show();
    }
}
