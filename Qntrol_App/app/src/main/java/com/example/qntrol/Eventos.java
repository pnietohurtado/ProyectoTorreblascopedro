package com.example.qntrol;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QueryDocumentSnapshot;

public class Eventos extends AppCompatActivity {

    private TextView tvEventName, tvEventTime;
    private View cvEventCard;
    private FirebaseFirestore db;
    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ThemeHelper.applyTheme(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_eventos);

        tvEventName = findViewById(R.id.tvEventName);
        tvEventTime = findViewById(R.id.tvEventTime);
        cvEventCard = findViewById(R.id.cvEventCard);
        db = FirebaseFirestore.getInstance();
        mAuth = FirebaseAuth.getInstance();

        loadEventData();

        cvEventCard.setOnClickListener(v -> {
            String eventId = (String) cvEventCard.getTag();
            if (eventId != null) {
                Intent intent = new Intent(Eventos.this, DetalleEvento.class);
                intent.putExtra("EVENT_NAME", tvEventName.getText().toString());
                intent.putExtra("EVENT_ID", eventId);
                startActivity(intent);
            }
        });

        ImageView ivSettings = findViewById(R.id.ivSettings);
        ivSettings.setOnClickListener(v -> showThemeDialog());
    }

    private void loadEventData() {
        FirebaseUser user = mAuth.getCurrentUser();
        if (user == null || user.getEmail() == null) {
            tvEventName.setText("Usuario no identificado");
            return;
        }

        String email = user.getEmail();

        // Path: usuarios/{email}/eventos
        db.collection("usuarios")
                .document(email)
                .collection("eventos")
                .limit(1)
                .get()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful() && task.getResult() != null && !task.getResult().isEmpty()) {
                        for (QueryDocumentSnapshot document : task.getResult()) {
                            String name = document.getString("nombreEvento");
                            String time = document.getString("hora");
                            String date = document.getString("fecha");
                            
                            tvEventName.setText(name != null ? name : "Sin nombre");
                            tvEventTime.setText((date != null ? date : "--") + " | " + (time != null ? time : "--"));
                            cvEventCard.setTag(document.getId());
                        }
                    } else {
                        tvEventName.setText("No hay eventos disponibles");
                        Log.d("Firebase", "No events found for user: " + email);
                        if (task.getException() != null) {
                            Log.e("Firebase", "Error getting events", task.getException());
                        }
                    }
                });
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
                    recreate();
                })
                .show();
    }
}