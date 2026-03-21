package com.example.qntrol;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.button.MaterialButton;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QueryDocumentSnapshot;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Eventos extends AppCompatActivity {

    private final int QR_REQUEST_CODE = 100;

    // View Elements
    private TextView tvTitle, tvAforo, tvEmptyMessage;
    private EditText etSearch;
    private RecyclerView rvInvitados;
    private View layoutEstadoVacio;
    private MaterialButton botonQR;
    private ImageView ivSettings;

    // Firebase
    private FirebaseFirestore db;
    private FirebaseAuth mAuth;

    // IDs (Fixed as per original)
    private String organizadorUid = "aOgugK6oqAYzLTF8vMb9qng2g9I2";
    private String eventoId = "pitirrin_1771068449500_mgmmoohmt";

    // Adapter and Lists
    private InvitadosAdapter adapter;
    private List<Invitado> listaInvitados = new ArrayList<>();
    private List<Invitado> listaInvitadosFiltrados = new ArrayList<>();

    // Counters
    private int totalPersonas = 0;
    private int personasEscaneadas = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ThemeHelper.applyTheme(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_eventos);

        db = FirebaseFirestore.getInstance();
        mAuth = FirebaseAuth.getInstance();

        initViews();
        setupRecyclerView();
        setupSearch();

        cargarTodosLosInvitados();

        ivSettings.setOnClickListener(v -> showThemeDialog());

        botonQR.setOnClickListener(view -> {
            Intent intent = new Intent(Eventos.this, QrScannerActivity.class);
            startActivityForResult(intent, QR_REQUEST_CODE);
        });
    }

    private void initViews() {
        tvTitle = findViewById(R.id.tvTitle);
        tvAforo = findViewById(R.id.tvAforo);
        etSearch = findViewById(R.id.etSearch);
        rvInvitados = findViewById(R.id.rvInvitados);
        layoutEstadoVacio = findViewById(R.id.layoutEstadoVacio);
        tvEmptyMessage = findViewById(R.id.tvEmptyMessage);
        botonQR = findViewById(R.id.btnQR);
        ivSettings = findViewById(R.id.ivSettings);
    }

    private void setupRecyclerView() {
        rvInvitados.setLayoutManager(new LinearLayoutManager(this));
        adapter = new InvitadosAdapter(listaInvitadosFiltrados);
        rvInvitados.setAdapter(adapter);
    }

    private void setupSearch() {
        if (etSearch != null) {
            etSearch.addTextChangedListener(new TextWatcher() {
                @Override
                public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

                @Override
                public void onTextChanged(CharSequence s, int start, int before, int count) {
                    filtrarInvitados(s.toString());
                }

                @Override
                public void afterTextChanged(Editable s) {}
            });
        }
    }


    private void cargarTodosLosInvitados() {
        db.collection("usuarios")
                .document(organizadorUid)
                .collection("eventos")
                .document(eventoId)
                .collection("invitados")
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    if (queryDocumentSnapshots.isEmpty()) {
                        tvEmptyMessage.setText("No hay invitados para este evento");
                        layoutEstadoVacio.setVisibility(View.VISIBLE);
                        rvInvitados.setVisibility(View.GONE);
                        return;
                    }

                    listaInvitados.clear();
                    totalPersonas = 0;
                    personasEscaneadas = 0;

                    for (QueryDocumentSnapshot document : queryDocumentSnapshots) {
                        Invitado invitado = new Invitado();
                        invitado.setId(document.getId());
                        invitado.setNombre(document.getString("nombre"));
                        invitado.setEmail(document.getString("email"));

                        Long numInvitados = document.getLong("numInvitados");
                        invitado.setNumInvitados(numInvitados != null ? numInvitados.intValue() : 1);

                        List<Map<String, Object>> personasMap = (List<Map<String, Object>>) document.get("personas");
                        List<Persona> personas = new ArrayList<>();

                        if (personasMap != null) {
                            for (Map<String, Object> personaMap : personasMap) {
                                Persona persona = new Persona();
                                persona.setId((String) personaMap.get("id"));
                                persona.setNombre((String) personaMap.get("nombre"));
                                persona.setEmail((String) personaMap.get("email"));
                                persona.setTelefono((String) personaMap.get("telefono"));

                                Boolean escaneado = (Boolean) personaMap.get("escaneado");
                                persona.setEscaneado(escaneado != null ? escaneado : false);

                                if (persona.isEscaneado()) {
                                    personasEscaneadas++;
                                }
                                personas.add(persona);
                            }
                        }

                        invitado.setPersonas(personas);
                        listaInvitados.add(invitado);
                        totalPersonas += personas.size();
                    }

                    listaInvitadosFiltrados.clear();
                    listaInvitadosFiltrados.addAll(listaInvitados);
                    adapter.notifyDataSetChanged();
                    actualizarUI();
                })
                .addOnFailureListener(e -> {
                    Log.e("Eventos", "Error al cargar datos", e);
                    tvEmptyMessage.setText("Error: " + e.getMessage());
                    layoutEstadoVacio.setVisibility(View.VISIBLE);
                    rvInvitados.setVisibility(View.GONE);
                });
    }

    private void filtrarInvitados(String query) {
        listaInvitadosFiltrados.clear();
        if (query.isEmpty()) {
            listaInvitadosFiltrados.addAll(listaInvitados);
        } else {
            String queryLower = query.toLowerCase();
            for (Invitado invitado : listaInvitados) {
                if (invitado.getNombre().toLowerCase().contains(queryLower)) {
                    listaInvitadosFiltrados.add(invitado);
                    continue;
                }
                for (Persona persona : invitado.getPersonas()) {
                    if (persona.getNombre().toLowerCase().contains(queryLower)) {
                        listaInvitadosFiltrados.add(invitado);
                        break;
                    }
                }
            }
        }

        if (listaInvitadosFiltrados.isEmpty() && !query.isEmpty()) {
            tvEmptyMessage.setText("No se encontraron resultados para \"" + query + "\"");
            layoutEstadoVacio.setVisibility(View.VISIBLE);
            rvInvitados.setVisibility(View.GONE);
        } else if (listaInvitados.isEmpty()) {
            layoutEstadoVacio.setVisibility(View.VISIBLE);
            rvInvitados.setVisibility(View.GONE);
        } else {
            layoutEstadoVacio.setVisibility(View.GONE);
            rvInvitados.setVisibility(View.VISIBLE);
        }
        adapter.notifyDataSetChanged();
    }

    private void actualizarUI() {
        if (tvAforo != null) tvAforo.setText("Aforo: " + personasEscaneadas + "/" + totalPersonas);
        if (tvTitle != null) tvTitle.setText("pitirrin");

        if (listaInvitados.isEmpty()) {
            layoutEstadoVacio.setVisibility(View.VISIBLE);
            rvInvitados.setVisibility(View.GONE);
        } else {
            layoutEstadoVacio.setVisibility(View.GONE);
            rvInvitados.setVisibility(View.VISIBLE);
        }
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

    // Model Classes
    public static class Invitado {
        private String id;
        private String nombre;
        private String email;
        private int numInvitados;
        private List<Persona> personas = new ArrayList<>();

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getNombre() { return nombre; }
        public void setNombre(String nombre) { this.nombre = nombre; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public int getNumInvitados() { return numInvitados; }
        public void setNumInvitados(int numInvitados) { this.numInvitados = numInvitados; }
        public List<Persona> getPersonas() { return personas; }
        public void setPersonas(List<Persona> personas) { this.personas = personas; }
    }

    public static class Persona {
        private String id;
        private String nombre;
        private String email;
        private String telefono;
        private boolean escaneado;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getNombre() { return nombre; }
        public void setNombre(String nombre) { this.nombre = nombre; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getTelefono() { return telefono; }
        public void setTelefono(String telefono) { this.telefono = telefono; }
        public boolean isEscaneado() { return escaneado; }
        public void setEscaneado(boolean escaneado) { this.escaneado = escaneado; }
    }

    // Adapter
    private class InvitadosAdapter extends RecyclerView.Adapter<InvitadosAdapter.InvitadoViewHolder> {
        private List<Invitado> invitados;
        public InvitadosAdapter(List<Invitado> invitados) { this.invitados = invitados; }

        @NonNull
        @Override
        public InvitadoViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_alumno, parent, false);
            return new InvitadoViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull InvitadoViewHolder holder, int position) {
            holder.bind(invitados.get(position));
        }

        @Override
        public int getItemCount() { return invitados.size(); }

        class InvitadoViewHolder extends RecyclerView.ViewHolder {
            TextView tvMainName, tvSubName1, tvSubName, tvTime, tvTime2;
            CheckBox cb1, cb;
            View ivArrow1, ivArrow;

            InvitadoViewHolder(@NonNull View itemView) {
                super(itemView);
                tvMainName = itemView.findViewById(R.id.tvMainName);
                tvSubName1 = itemView.findViewById(R.id.tvSubName1);
                tvSubName = itemView.findViewById(R.id.tvSubName);
                tvTime = itemView.findViewById(R.id.tvTime);
                tvTime2 = itemView.findViewById(R.id.tvTime2);
                cb1 = itemView.findViewById(R.id.cb1);
                cb = itemView.findViewById(R.id.cb);
                ivArrow1 = itemView.findViewById(R.id.ivArrow1);
                ivArrow = itemView.findViewById(R.id.ivArrow);

                itemView.setOnClickListener(v -> {
                    Intent intent = new Intent(Eventos.this, DetalleEvento.class);
                    // Usando los mismos valores hardcodeados que ya tiene la clase para consistencia
                    intent.putExtra("EVENT_ID", "pitirrin_organizador_aOgugK6oqAYzLTF8vMb9qng2g9I2");
                    intent.putExtra("EVENT_NAME", "pitirrin");
                    startActivity(intent);
                });
            }

            void bind(Invitado invitado) {
                tvMainName.setText(invitado.getNombre());
                List<Persona> personas = invitado.getPersonas();
                if (personas.size() >= 1) {
                    Persona p = personas.get(0);
                    tvSubName1.setText(p.getNombre());
                    cb1.setChecked(p.isEscaneado());
                    tvSubName1.setVisibility(View.VISIBLE);
                    tvTime.setVisibility(View.VISIBLE);
                    cb1.setVisibility(View.VISIBLE);
                    ivArrow1.setVisibility(View.VISIBLE);
                } else {
                    tvSubName1.setVisibility(View.GONE);
                    tvTime.setVisibility(View.GONE);
                    cb1.setVisibility(View.GONE);
                    ivArrow1.setVisibility(View.GONE);
                }

                if (personas.size() >= 2) {
                    Persona p = personas.get(1);
                    tvSubName.setText(p.getNombre());
                    cb.setChecked(p.isEscaneado());
                    tvSubName.setVisibility(View.VISIBLE);
                    tvTime2.setVisibility(View.VISIBLE);
                    cb.setVisibility(View.VISIBLE);
                    ivArrow.setVisibility(View.VISIBLE);
                } else {
                    tvSubName.setVisibility(View.GONE);
                    tvTime2.setVisibility(View.GONE);
                    cb.setVisibility(View.GONE);
                    ivArrow.setVisibility(View.GONE);
                }
            }
        }
    }
}

