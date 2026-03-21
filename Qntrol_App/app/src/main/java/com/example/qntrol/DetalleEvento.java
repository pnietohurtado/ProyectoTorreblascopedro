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
import com.google.firebase.Timestamp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.ListenerRegistration;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class DetalleEvento extends AppCompatActivity {

    private MaterialButton botonQR;
    private TextView tvTitle, tvAforo, tvMainName, tvSubName1, tvSubName2, tvTime1, tvTime2;
    private EditText etSearch;
    private CheckBox cb1, cb2;
    private View layoutEstadoAlumno, layoutEstadoVacio;
    private ImageView ivBack;
    private View ivArrow2; 
    
    private FirebaseFirestore db;
    private FirebaseAuth mAuth;
    private String eventId, eventName, userEmail;
    
    private final int QR_REQUEST_CODE = 100;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault());
    
    private List<DocumentSnapshot> allGuestsList = new ArrayList<>();
    private ListenerRegistration guestsListener;

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
        tvSubName2 = findViewById(R.id.tvSubName); 
        tvTime1 = findViewById(R.id.tvTime);
        tvTime2 = findViewById(R.id.tvTime2);
        ivArrow2 = findViewById(R.id.ivArrow);
        
        cb1 = findViewById(R.id.cb1);
        cb2 = findViewById(R.id.cb); 

        // Intent data
        eventName = getIntent().getStringExtra("EVENT_NAME");
        eventId = getIntent().getStringExtra("EVENT_ID");
        
        if (eventName != null) tvTitle.setText(eventName);

        ivBack.setOnClickListener(v -> finish());
        
        startRealtimeSync(); 
        setupSearch();

        botonQR.setOnClickListener(view -> {
            Intent intent = new Intent(DetalleEvento.this, QrScannerActivity.class);
            intent.putExtra("EVENT_ID", eventId);
            startActivityForResult(intent, QR_REQUEST_CODE);
        });

        ImageView ivSettings = findViewById(R.id.ivSettings);
        ivSettings.setOnClickListener(v -> showThemeDialog());
    }

    private void startRealtimeSync() {
        if (userEmail == null || eventId == null) return;

        // Limpiar listener previo si existe
        if (guestsListener != null) guestsListener.remove();

        guestsListener = db.collection("usuarios")
                .document(userEmail)
                .collection("eventos")
                .document(eventId)
                .collection("invitados")
                .addSnapshotListener((snapshots, e) -> {
                    if (e != null) {
                        Log.e("DetalleEvento", "Firestore listen failed", e);
                        return;
                    }

                    if (snapshots != null) {
                        allGuestsList = snapshots.getDocuments();
                        updateAforoDisplay();
                        
                        // Si hay una búsqueda activa, refresca los datos en pantalla
                        String currentQuery = etSearch.getText().toString().trim().toLowerCase();
                        if (!currentQuery.isEmpty()) {
                            buscarAlumnoLocal(currentQuery);
                        }
                    }
                });
    }

    private void setupSearch() {
        etSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String query = s.toString().trim().toLowerCase();
                if (query.isEmpty()) {
                    layoutEstadoAlumno.setVisibility(View.GONE);
                    layoutEstadoVacio.setVisibility(View.VISIBLE);
                } else {
                    buscarAlumnoLocal(query);
                }
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void buscarAlumnoLocal(String query) {
        DocumentSnapshot matchedDoc = null;
        for (DocumentSnapshot doc : allGuestsList) {
            String nombre = doc.getString("nombre");
            if (nombre != null && nombre.toLowerCase().contains(query)) {
                matchedDoc = doc;
                break;
            }
        }

        if (matchedDoc != null) {
            mostrarAlumno(matchedDoc);
        } else {
            layoutEstadoAlumno.setVisibility(View.GONE);
            layoutEstadoVacio.setVisibility(View.VISIBLE);
        }
    }

    @SuppressWarnings("unchecked")
    private void mostrarAlumno(DocumentSnapshot doc) {
        layoutEstadoAlumno.setVisibility(View.VISIBLE);
        layoutEstadoVacio.setVisibility(View.GONE);

        String nombreTitular = doc.getString("nombre");
        tvMainName.setText(nombreTitular);

        List<Map<String, Object>> personas = (List<Map<String, Object>>) doc.get("personas");
        
        // Reset listeners
        cb1.setOnCheckedChangeListener(null);
        cb2.setOnCheckedChangeListener(null);

        if (personas != null && !personas.isEmpty()) {
            // Invitado 1
            Map<String, Object> p1 = personas.get(0);
            String name1 = (String) p1.get("nombre");
            Boolean esc1 = (Boolean) p1.get("escaneado");
            Timestamp time1 = (Timestamp) p1.get("fechaEscaneo");

            tvSubName1.setText(name1 != null ? name1 : "Invitado 1");
            cb1.setChecked(esc1 != null && esc1);
            tvTime1.setText(time1 != null ? dateFormat.format(time1.toDate()) : "No registrado");

            // Invitado 2
            if (personas.size() >= 2) {
                Map<String, Object> p2 = personas.get(1);
                String name2 = (String) p2.get("nombre");
                Boolean esc2 = (Boolean) p2.get("escaneado");
                Timestamp time2 = (Timestamp) p2.get("fechaEscaneo");

                tvSubName2.setText(name2 != null ? name2 : "Invitado 2");
                cb2.setChecked(esc2 != null && esc2);
                tvTime2.setText(time2 != null ? dateFormat.format(time2.toDate()) : "No registrado");
                
                toggleGuest2Visibility(true);
            } else {
                toggleGuest2Visibility(false);
            }
        }

        // Set listeners for manual update
        cb1.setOnCheckedChangeListener((buttonView, isChecked) -> updateAsistenciaManual(doc.getId(), 0, isChecked));
        cb2.setOnCheckedChangeListener((buttonView, isChecked) -> updateAsistenciaManual(doc.getId(), 1, isChecked));
    }

    private void toggleGuest2Visibility(boolean visible) {
        int visibility = visible ? View.VISIBLE : View.GONE;
        tvSubName2.setVisibility(visibility);
        tvTime2.setVisibility(visibility);
        cb2.setVisibility(visibility);
        ivArrow2.setVisibility(visibility);
    }

    @SuppressWarnings("unchecked")
    private void updateAsistenciaManual(String docId, int index, boolean isChecked) {
        if (userEmail == null || eventId == null) return;

        db.collection("usuarios")
                .document(userEmail)
                .collection("eventos")
                .document(eventId)
                .collection("invitados")
                .document(docId)
                .get()
                .addOnSuccessListener(documentSnapshot -> {
                    List<Map<String, Object>> personas = (List<Map<String, Object>>) documentSnapshot.get("personas");
                    if (personas != null && index < personas.size()) {
                        Map<String, Object> persona = personas.get(index);
                        persona.put("escaneado", isChecked);
                        persona.put("fechaEscaneo", isChecked ? Timestamp.now() : null);

                        documentSnapshot.getReference().update("personas", personas)
                                .addOnSuccessListener(aVoid -> {
                                    // El SnapshotListener se encargará de refrescar la UI automáticamente
                                });
                    }
                });
    }

    private void updateAforoDisplay() {
        int total = 0;
        int presentes = 0;
        for (DocumentSnapshot doc : allGuestsList) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> personas = (List<Map<String, Object>>) doc.get("personas");
            if (personas != null) {
                total += personas.size();
                for (Map<String, Object> p : personas) {
                    if (p.get("escaneado") != null && (boolean) p.get("escaneado")) presentes++;
                }
            }
        }
        tvAforo.setText("Aforo: " + presentes + "/" + total);
    }

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

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        // El SnapshotListener ya se encarga de refrescar si el escáner cambió datos
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (guestsListener != null) {
            guestsListener.remove();
        }
    }
}
