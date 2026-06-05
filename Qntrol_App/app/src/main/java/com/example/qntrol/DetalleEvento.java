package com.example.qntrol;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.Log;
import android.view.View;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.LinearLayout;
import android.view.LayoutInflater;
import android.widget.Toast;

import android.view.MotionEvent;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.firebase.Timestamp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.ListenerRegistration;

import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class DetalleEvento extends AppCompatActivity {

    private MaterialButton botonQR;
    private TextView tvTitle, tvAforo;
    private EditText etSearch;
    private View nsvSearchResults, layoutEstadoVacio;
    private ImageView ivBack;
    private LinearLayout layoutSearchResultsContainer;
    
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
        LanguageHelper.applyLanguage(this);
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
        
        nsvSearchResults = findViewById(R.id.nsvSearchResults);
        layoutEstadoVacio = findViewById(R.id.layoutEstadoVacio);
        layoutSearchResultsContainer = findViewById(R.id.layoutSearchResultsContainer);

        // Intent data
        eventName = getIntent().getStringExtra("EVENT_NAME");
        eventId = getIntent().getStringExtra("EVENT_ID");
        
        if (eventName != null) tvTitle.setText(eventName);

        ivBack.setOnClickListener(v -> finish());
        
        startRealtimeSync(); 
        setupSearch();

        botonQR.setOnClickListener(view -> {
            Log.d("DetalleEvento", "QR Button clicked, eventId: " + eventId);
            if (eventId == null) {
                Toast.makeText(this, R.string.event_id_missing_error, Toast.LENGTH_SHORT).show();
                return;
            }
            Intent intent = new Intent(DetalleEvento.this, QrScannerActivity.class);
            intent.putExtra("EVENT_ID", eventId);
            startActivityForResult(intent, QR_REQUEST_CODE);
        });

        ImageView ivSettings = findViewById(R.id.ivSettings);
        ivSettings.setOnClickListener(v -> startActivity(new Intent(this, SettingsActivity.class)));
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
                        String currentQuery = etSearch.getText().toString().trim();
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
                String query = s.toString().trim();
                if (query.isEmpty()) {
                    nsvSearchResults.setVisibility(View.GONE);
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
        List<DocumentSnapshot> matchedDocs = new ArrayList<>();
        for (DocumentSnapshot doc : allGuestsList) {
            if (matchesGuestSearch(doc, query)) {
                matchedDocs.add(doc);
            }
        }

        if (!matchedDocs.isEmpty()) {
            mostrarAlumnos(matchedDocs);
        } else {
            nsvSearchResults.setVisibility(View.GONE);
            layoutEstadoVacio.setVisibility(View.VISIBLE);
        }
    }

    @SuppressWarnings("unchecked")
    private void mostrarAlumnos(List<DocumentSnapshot> matchedDocs) {
        nsvSearchResults.setVisibility(View.VISIBLE);
        layoutEstadoVacio.setVisibility(View.GONE);

        // Limpiar tarjetas de búsqueda anteriores
        layoutSearchResultsContainer.removeAllViews();

        for (DocumentSnapshot doc : matchedDocs) {
            // Inflar la tarjeta del alumno
            View cardView = LayoutInflater.from(this).inflate(R.layout.item_student_card, layoutSearchResultsContainer, false);
            
            TextView tvCardMainName = cardView.findViewById(R.id.tvMainName);
            LinearLayout layoutCardGuestsContainer = cardView.findViewById(R.id.layoutGuestsContainer);

            String nombreTitular = getGuestOwnerName(doc);
            if (nombreTitular == null) nombreTitular = getString(R.string.student_fallback_name);
            tvCardMainName.setText(nombreTitular);

            List<Map<String, Object>> personas = (List<Map<String, Object>>) doc.get("personas");

            if (personas != null) {
                for (int i = 0; i < personas.size(); i++) {
                    Map<String, Object> p = personas.get(i);
                    // Ocultamos al titular (alumno principal) de la lista de invitados
                    if (!isTitularPersona(p, i, personas.size(), nombreTitular, doc.getId(), doc.getString("id"))) {
                        inflarInvitado(p, i, doc.getId(), layoutCardGuestsContainer);
                    }
                }
            }

            layoutSearchResultsContainer.addView(cardView);
        }
    }

    private void inflarInvitado(Map<String, Object> p, int originalIndex, String docId, LinearLayout container) {
        View guestView = LayoutInflater.from(this).inflate(R.layout.item_guest, container, false);
        
        TextView tvName = guestView.findViewById(R.id.tvGuestName);
        TextView tvTime = guestView.findViewById(R.id.tvGuestTime);
        CheckBox cb = guestView.findViewById(R.id.cbGuest);

        String name = getPersonaName(p);
        Boolean esc = (Boolean) p.get("escaneado");
        Timestamp time = (Timestamp) p.get("fechaEscaneo");

        tvName.setText(!TextUtils.isEmpty(name) ? name : getString(R.string.generic_guest_with_number, originalIndex + 1));
        cb.setChecked(esc != null && esc);
        tvTime.setText(time != null ? dateFormat.format(time.toDate()) : getString(R.string.guest_not_registered));

        cb.setOnCheckedChangeListener((buttonView, isChecked) -> updateAsistenciaManual(docId, originalIndex, isChecked));
        
        container.addView(guestView);
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
                                    if (isChecked) {
                                        AppLogHelper.logEntryAccepted(
                                                this,
                                                getString(R.string.generic_guest_with_number, index + 1),
                                                getGuestOwnerName(documentSnapshot),
                                                getString(R.string.log_source_check)
                                        );
                                    }
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
        tvAforo.setText(getString(R.string.capacity_format, presentes, total));
    }

    @SuppressWarnings("unchecked")
    private boolean matchesGuestSearch(DocumentSnapshot doc, String query) {
        String normalizedQuery = normalizeSearchText(query);
        if (normalizedQuery.isEmpty()) return false;

        String[] rootFields = {
                "NOMBRE", "nombre", "Nombre",
                "APELLIDOS", "apellidos", "Apellidos",
                "APELLIDO", "apellido", "Apellido",
                "EMAIL", "email", "Email"
        };

        for (String field : rootFields) {
            if (containsSearchText(doc.getString(field), normalizedQuery)) {
                return true;
            }
        }

        List<Map<String, Object>> personas = (List<Map<String, Object>>) doc.get("personas");
        if (personas == null) return false;

        String[] personFields = {
                "NOMBRE", "nombre", "Nombre",
                "APELLIDOS", "apellidos", "Apellidos",
                "APELLIDO", "apellido", "Apellido",
                "EMAIL", "email", "Email"
        };

        for (Map<String, Object> persona : personas) {
            for (String field : personFields) {
                Object value = persona.get(field);
                if (value instanceof String && containsSearchText((String) value, normalizedQuery)) {
                    return true;
                }
            }
        }

        return false;
    }

    private String getGuestOwnerName(DocumentSnapshot doc) {
        String nombreMayusculas = doc.getString("NOMBRE");
        if (!TextUtils.isEmpty(nombreMayusculas)) return nombreMayusculas;

        String nombreMinusculas = doc.getString("nombre");
        if (!TextUtils.isEmpty(nombreMinusculas)) return nombreMinusculas;

        String nombreCapitalizado = doc.getString("Nombre");
        if (!TextUtils.isEmpty(nombreCapitalizado)) return nombreCapitalizado;

        return null;
    }

    private boolean isTitularPersona(Map<String, Object> persona, int index, int totalPersonas, String nombreTitular, String docId, String docDbId) {
        if (persona == null) return false;

        String personaQr = null;
        String[] qrKeys = {"qrCode", "id", "QR", "qr"};
        for (String key : qrKeys) {
            Object val = persona.get(key);
            if (val != null && !String.valueOf(val).trim().isEmpty()) {
                personaQr = String.valueOf(val).trim();
                break;
            }
        }

        // Si tenemos el QR de la persona y el ID del documento, comparamos por ID directamente
        if (personaQr != null) {
            if (docId != null && !docId.trim().isEmpty() && personaQr.equalsIgnoreCase(docId.trim())) {
                return true;
            }
            if (docDbId != null && !docDbId.trim().isEmpty() && personaQr.equalsIgnoreCase(docDbId.trim())) {
                return true;
            }
            // Si el QR existe pero no coincide con el del documento, son personas distintas (no es el titular)
            return false;
        }

        // Fallback por nombre solo si no pudimos comparar por ID/QR
        if (totalPersonas <= 1 || index != 0 || TextUtils.isEmpty(nombreTitular)) {
            return false;
        }

        String personaName = getPersonaName(persona);
        return !TextUtils.isEmpty(personaName)
                && normalizeSearchText(personaName).equals(normalizeSearchText(nombreTitular));
    }

    private String getPersonaName(Map<String, Object> persona) {
        if (persona == null) return null;

        String[] fields = {"NOMBRE", "nombre", "Nombre"};
        for (String field : fields) {
            Object value = persona.get(field);
            if (value instanceof String && !TextUtils.isEmpty((String) value)) {
                return ((String) value).trim();
            }
        }

        return null;
    }

    private boolean containsSearchText(String value, String normalizedQuery) {
        return !TextUtils.isEmpty(value) && normalizeSearchText(value).contains(normalizedQuery);
    }

    private String normalizeSearchText(String value) {
        if (value == null) return "";

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.toLowerCase(Locale.ROOT).trim();
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
    @Override
    public boolean dispatchTouchEvent(MotionEvent event) {
        if (event.getActionMasked() == MotionEvent.ACTION_DOWN) {
            View v = getCurrentFocus();
            if (v instanceof EditText) {
                int[] outLocation = new int[2];
                v.getLocationOnScreen(outLocation);
                float x = event.getRawX() + v.getLeft() - outLocation[0];
                float y = event.getRawY() + v.getTop() - outLocation[1];
                if (x < v.getLeft() || x > v.getRight() || y < v.getTop() || y > v.getBottom()) {
                    v.clearFocus();
                    InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                    imm.hideSoftInputFromWindow(v.getWindowToken(), 0);
                }
            }
        }
        return super.dispatchTouchEvent(event);
    }
}
