package com.example.qntrol;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.Toast;

import com.google.firebase.auth.FirebaseAuth;

public class Login extends AppCompatActivity {

    private EditText etEmail, etPassword;
    private Button btnInicioSesion;
    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ThemeHelper.applyTheme(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Inicializar Firebase Auth
        mAuth = FirebaseAuth.getInstance();

        // Referencias a la UI
        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        btnInicioSesion = findViewById(R.id.btnInicioSesion);

        btnInicioSesion.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                loginUsuario();
            }
        });

        ImageView ivSettings = findViewById(R.id.ivSettings);
        ivSettings.setOnClickListener(v -> showThemeDialog());
    }

    private void showThemeDialog() {
        String[] themes = {"Tema Claro", "Tema Oscuro"};
        int checkedItem = ThemeHelper.getSelectedTheme(this) == ThemeHelper.THEME_LIGHT ? 0 : 1;

        new AlertDialog.Builder(this)
                .setTitle("Seleccionar Tema")
                .setSingleChoiceItems(themes, checkedItem, (dialog, which) -> {
                    if (which == 0) {
                        ThemeHelper.setTheme(this, ThemeHelper.THEME_LIGHT);
                    } else {
                        ThemeHelper.setTheme(this, ThemeHelper.THEME_DARK);
                    }
                    dialog.dismiss();
                    recreate(); // Reload activity to apply theme
                })
                .show();
    }

    private void loginUsuario() {
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString().trim();

        // Validaciones básicas
        if (TextUtils.isEmpty(email)) {
            etEmail.setError("Ingresa el email");
            return;
        }

        if (TextUtils.isEmpty(password)) {
            etPassword.setError("Ingresa la contraseña");
            return;
        }

        // Login con Firebase
        mAuth.signInWithEmailAndPassword(email, password)
                .addOnCompleteListener(this, task -> {
                    if (task.isSuccessful()) {
                        Toast.makeText(Login.this,
                                "Inicio de sesión exitoso",
                                Toast.LENGTH_SHORT).show();

                        // abrir otra Activity
                        startActivity(new Intent(Login.this, Eventos.class));
                        finish();

                    } else {
                        Toast.makeText(Login.this,
                                "Error: " + task.getException().getMessage(),
                                Toast.LENGTH_LONG).show();
                    }
                });
    }
}