package com.example.qntrol;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.Toast;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import android.widget.FrameLayout;
import android.view.ViewGroup;

public class Login extends AppCompatActivity {

    private EditText etEmail, etPassword;
    private Button btnInicioSesion, btnGoogle, btnForgotPass;
    private FirebaseAuth mAuth;
    private GoogleSignInClient mGoogleSignInClient;
    private static final int RC_SIGN_IN = 9001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ThemeHelper.applyTheme(this);
        LanguageHelper.applyLanguage(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Inicializar Firebase Auth
        mAuth = FirebaseAuth.getInstance();

        // Configurar Google Sign-In
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken("YOUR_WEB_CLIENT_ID.apps.googleusercontent.com")
                .requestEmail()
                .build();
        mGoogleSignInClient = GoogleSignIn.getClient(this, gso);


        // Referencias a la UI
        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        btnInicioSesion = findViewById(R.id.btnInicioSesion);

        btnInicioSesion.setOnClickListener(v -> loginUsuario());

        btnGoogle = findViewById(R.id.btnGoogle);
        btnGoogle.setOnClickListener(v -> signInWithGoogle());

        btnForgotPass = findViewById(R.id.button6);
        btnForgotPass.setOnClickListener(v -> showForgotPasswordDialog());

        ImageView ivSettings = findViewById(R.id.ivSettings);
        ivSettings.setOnClickListener(v -> {
            Intent intent = new Intent(this, SettingsActivity.class);
            intent.putExtra("HIDE_LOGOUT", true);
            startActivity(intent);
        });
    }

    @Override
    protected void onStart() {
        super.onStart();
        // Persistencia: Si hay usuario, ir a la pantalla de eventos
        FirebaseUser currentUser = mAuth.getCurrentUser();
        if (currentUser != null) {
            startActivity(new Intent(this, Eventos.class));
            finish();
        }
    }

    private void signInWithGoogle() {
        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
        startActivityForResult(signInIntent, RC_SIGN_IN);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                firebaseAuthWithGoogle(account.getIdToken());
            } catch (ApiException e) {
                Log.w("Login", "Google sign in failed", e);
                Toast.makeText(this, R.string.google_connection_error, Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void firebaseAuthWithGoogle(String idToken) {
        AuthCredential credential = GoogleAuthProvider.getCredential(idToken, null);
        mAuth.signInWithCredential(credential)
                .addOnCompleteListener(this, task -> {
                    if (task.isSuccessful()) {
                        startActivity(new Intent(Login.this, Eventos.class));
                        finish();
                    } else {
                        Toast.makeText(Login.this, R.string.firebase_auth_error, Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void showForgotPasswordDialog() {
        // Create an EditText with proper Material styling
        EditText etEmailReset = new EditText(this);
        etEmailReset.setHint("email@example.com");
        
        // Wrap EditText in a FrameLayout for better padding/margins inside Material dialog
        FrameLayout container = new FrameLayout(this);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        int margin = (int) (24 * getResources().getDisplayMetrics().density); // 24dp margin
        params.leftMargin = margin;
        params.rightMargin = margin;
        params.topMargin = (int) (8 * getResources().getDisplayMetrics().density); // 8dp top
        etEmailReset.setLayoutParams(params);
        container.addView(etEmailReset);

        // Pre-fill if user already typed something
        String currentEmail = etEmail.getText().toString().trim();
        if (!TextUtils.isEmpty(currentEmail)) {
            etEmailReset.setText(currentEmail);
        }

        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.reset_pass_title)
                .setMessage(R.string.reset_pass_msg)
                .setView(container)
                .setPositiveButton(R.string.btn_send, (dialog, which) -> {
                    String email = etEmailReset.getText().toString().trim();
                    if (!TextUtils.isEmpty(email)) {
                        mAuth.sendPasswordResetEmail(email)
                                .addOnCompleteListener(task -> {
                                    if (task.isSuccessful()) {
                                        Toast.makeText(Login.this, getString(R.string.reset_pass_success, email), Toast.LENGTH_LONG).show();
                                    } else {
                                        Toast.makeText(Login.this, getString(R.string.reset_pass_error), Toast.LENGTH_SHORT).show();
                                    }
                                });
                    }
                })
                .setNegativeButton(R.string.btn_cancel, null)
                .show();
    }

    private void loginUsuario() {
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString().trim();

        Log.d("Login", "Intentando login con: " + email);

        if (TextUtils.isEmpty(email)) {
            etEmail.setError(getString(R.string.email_required_error));
            return;
        }

        if (TextUtils.isEmpty(password)) {
            etPassword.setError(getString(R.string.password_required_error));
            return;
        }

        mAuth.signInWithEmailAndPassword(email, password)
                .addOnCompleteListener(this, task -> {
                    if (task.isSuccessful()) {
                        startActivity(new Intent(Login.this, Eventos.class));
                        finish();
                    } else {
                        // Mensaje de error genérico por seguridad y UX
                        Toast.makeText(Login.this, 
                                R.string.invalid_credentials,
                                Toast.LENGTH_LONG).show();
                    }
                });
    }
}
