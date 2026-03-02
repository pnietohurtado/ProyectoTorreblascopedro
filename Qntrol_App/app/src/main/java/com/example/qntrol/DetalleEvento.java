package com.example.qntrol;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.View;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QueryDocumentSnapshot;

import java.util.HashMap;
import java.util.Map;

public class DetalleEvento extends AppCompatActivity {

    private MaterialButton botonQR;
    private TextView tvTitle, tvAforo, tvMainName, tvSubName1, tvSubName2, tvTime1, tvTime2;
    private EditText etSearch;
    private CheckBox cb1, cb2;
    private View layoutEstadoAlumno, layoutEstadoVacio;
    private ImageView ivBack;
    
    private FirebaseFirestore db;
    private FirebaseAuth mAuth;
    private String eventId, eventName, userEmail;
    
    private final int QR_REQUEST_CODE = 100;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ThemeHelper.applyTheme(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_detalle_evento);

        db = FirebaseFirestore.getInstance();
        mAuth = FirebaseAuth.getInstance();
        
        FirebaseUser user = mAuth.getCurrentUser();
        if (user != null) {
            userEmail = user.getEmail();
        }

        // Referencias
        botonQR = findViewById(R.id.btnQR);
        tvTitle = findViewById(R.id.tvGraduacionTitle);
        tvAforo = findViewById(R.id.tvAforo);
        etSearch = findViewById(R.id.etSearch);
        ivBack = findViewById(R.id.ivBack);
        
        layoutEstadoAlumno = findViewById(R.id.layoutEstadoAlumno);
        layoutEstadoVacio = findViewById(R.id.layoutEstadoVacio);
        
        tvMainName = findViewById(R.id.tvMainName);
        tvSubName1 = findViewById(R.id.tvSubName1);
        tvSubName2 = findViewById(R.id.tvSubName); // Nota: ID en el layout es tvSubName
        tvTime1 = findViewById(R.id.tvTime);
        tvTime2 = findViewById(R.id.tvTime2);
        
        cb1 = findViewById(R.id.cb1);
        cb2 = findViewById(R.id.cb); // Nota: ID en el layout es cb

        // Intent data
        eventName = getIntent().getStringExtra("EVENT_NAME");
        eventId = getIntent().getStringExtra("EVENT_ID");
        
        if (eventName != null) tvTitle.setText(eventName);

        ivBack.setOnClickListener(v -> finish());
        
        setupSearch();
        updateAforo();

        // Evento del botón para abrir la Activity de escaneo
        botonQR.setOnClickListener(view -> {
            Intent intent = new Intent(DetalleEvento.this, QrScannerActivity.class);
            intent.putExtra("EVENT_ID", eventId);
            startActivityForResult(intent, QR_REQUEST_CODE);
        });

        ImageView ivSettings = findViewById(R.id.ivSettings);
        ivSettings.setOnClickListener(v -> showThemeDialog());
    }

    // Método para buscar un Alumno
    private void setupSearch() {
        etSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String query = s.toString().trim();
                if (query.isEmpty()) {
                    layoutEstadoAlumno.setVisibility(View.GONE);
                    layoutEstadoVacio.setVisibility(View.VISIBLE);
                } else {
                    buscarAlumno(query);
                }
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void buscarAlumno(String nombre) {
        if (userEmail == null || eventId == null) return;

        db.collection("usuarios")
                .document(userEmail)
                .collection("eventos")
                .document(eventId)
                .collection("invitados")
                .whereGreaterThanOrEqualTo("nombre", nombre)
                .whereLessThanOrEqualTo("nombre", nombre + "\uf8ff")
                .limit(1)
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    if (!queryDocumentSnapshots.isEmpty()) {
                        QueryDocumentSnapshot doc = (QueryDocumentSnapshot) queryDocumentSnapshots.getDocuments().get(0);
                        mostrarAlumno(doc);
                    } else {
                        layoutEstadoAlumno.setVisibility(View.GONE);
                        layoutEstadoVacio.setVisibility(View.VISIBLE);
                    }
                });
    }

    //
    private void mostrarAlumno(QueryDocumentSnapshot doc) {
        layoutEstadoAlumno.setVisibility(View.VISIBLE);
        layoutEstadoVacio.setVisibility(View.GONE);

        String nombre = doc.getString("nombre");
        boolean asistencia1 = doc.getBoolean("asistencia1") != null && doc.getBoolean("asistencia1");
        boolean asistencia2 = doc.getBoolean("asistencia2") != null && doc.getBoolean("asistencia2");
        
        tvMainName.setText(nombre);
        cb1.setChecked(asistencia1);
        cb2.setChecked(asistencia2);

        // Actualiza listeners
        cb1.setOnCheckedChangeListener((buttonView, isChecked) -> updateAsistencia(doc.getId(), "asistencia1", isChecked));
        cb2.setOnCheckedChangeListener((buttonView, isChecked) -> updateAsistencia(doc.getId(), "asistencia2", isChecked));
    }

    // Método que actualiza el aforo (sirve para cuando se escanea el QR)
    private void updateAsistencia(String alumnoId, String campo, boolean valor) {
        if (userEmail == null || eventId == null) return;

        db.collection("usuarios")
                .document(userEmail)
                .collection("eventos")
                .document(eventId)
                .collection("invitados")
                .document(alumnoId)
                .update(campo, valor)
                .addOnSuccessListener(aVoid -> updateAforo());
    }

    // Método para contar el aforo
    private void updateAforo() {
        if (userEmail == null || eventId == null) return;

        // Cuenta por alumno, 2 invitados
        db.collection("usuarios")
                .document(userEmail)
                .collection("eventos")
                .document(eventId)
                .collection("invitados")
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    int total = queryDocumentSnapshots.size();
                    int presentes = 0;
                    for (DocumentSnapshot doc : queryDocumentSnapshots) {
                        if (doc.getBoolean("asistencia1") != null && doc.getBoolean("asistencia1")) presentes++;
                        if (doc.getBoolean("asistencia2") != null && doc.getBoolean("asistencia2")) presentes++;
                    }
                    tvAforo.setText("Aforo: " + presentes + "/" + (total * 2)); // Asumiendo que son 2 invitados
                });
    }

    // Método para cambiar el tema
    private void showThemeDialog() {
        String[] themes = {"Tema Claro", "Tema Oscuro"};
        int checkedItem = ThemeHelper.getSelectedTheme(this) == ThemeHelper.THEME_LIGHT ? 0 : 1;

        new AlertDialog.Builder(this)
                .setTitle("Seleccionar Tema")
                .setSingleChoiceItems(themes, checkedItem, (dialog, which) -> {
                    if (which == 0) ThemeHelper.setTheme(this, ThemeHelper.THEME_LIGHT);
                    else ThemeHelper.setTheme(this, ThemeHelper.THEME_DARK);
                    dialog.dismiss();
                    recreate();
                })
                .show();
    }

    // Saca el resultado del QR
    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == QR_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            String codigoLeido = data.getStringExtra("QR_VALUE");
            if (codigoLeido != null) {
                etSearch.setText(codigoLeido);
            }
        }
    }
}
