package com.example.qntrol;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QueryDocumentSnapshot;

import java.util.ArrayList;
import java.util.List;

public class Eventos extends AppCompatActivity {

    private RecyclerView rvEventos;
    private EventoAdapter adapter;
    private List<Evento> eventoList;
    private SwipeRefreshLayout swipeRefresh;
    private FirebaseFirestore db;
    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ThemeHelper.applyTheme(this);
        LanguageHelper.applyLanguage(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_eventos);

        db = FirebaseFirestore.getInstance();
        mAuth = FirebaseAuth.getInstance();

        // Initialize UI
        swipeRefresh = findViewById(R.id.swipeRefresh);
        rvEventos = findViewById(R.id.rvEventos);
        rvEventos.setLayoutManager(new LinearLayoutManager(this));

        eventoList = new ArrayList<>();
        adapter = new EventoAdapter(eventoList, evento -> {
            Intent intent = new Intent(Eventos.this, DetalleEvento.class);
            intent.putExtra("EVENT_NAME", evento.getNombreEvento());
            intent.putExtra("EVENT_ID", evento.getId());
            startActivity(intent);
        });
        rvEventos.setAdapter(adapter);

        // Setup Refresh
        swipeRefresh.setOnRefreshListener(this::loadEventData);

        loadEventData();

        ImageView ivSettings = findViewById(R.id.ivSettings);
        ivSettings.setOnClickListener(v -> startActivity(new Intent(this, SettingsActivity.class)));
    }

    private void loadEventData() {
        FirebaseUser user = mAuth.getCurrentUser();
        if (user == null || user.getEmail() == null) {
            swipeRefresh.setRefreshing(false);
            return;
        }

        String email = user.getEmail();
        swipeRefresh.setRefreshing(true);

        // Path: usuarios/{email}/eventos
        db.collection("usuarios")
                .document(email)
                .collection("eventos")
                .orderBy("fecha", Query.Direction.DESCENDING)
                .orderBy("hora", Query.Direction.DESCENDING)
                .get()
                .addOnCompleteListener(task -> {
                    swipeRefresh.setRefreshing(false);
                    if (task.isSuccessful() && task.getResult() != null) {
                        eventoList.clear();
                        for (QueryDocumentSnapshot document : task.getResult()) {
                            Evento evento = document.toObject(Evento.class);
                            evento.setId(document.getId());
                            eventoList.add(evento);
                        }
                        adapter.notifyDataSetChanged();
                        
                        if (eventoList.isEmpty()) {
                            Toast.makeText(this, "No hay eventos disponibles", Toast.LENGTH_SHORT).show();
                        }
                    } else {
                        Log.e("Firebase", "Error getting events", task.getException());
                        Toast.makeText(this, "Error al cargar eventos", Toast.LENGTH_SHORT).show();
                    }
                });
    }
}