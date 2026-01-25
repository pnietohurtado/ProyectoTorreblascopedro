package com.example.qntrol;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;

public class Eventos extends AppCompatActivity {

    private MaterialButton botonQR;
    private final int QR_REQUEST_CODE = 100; // Código para identificar la Activity de QR

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_eventos);

        botonQR = findViewById(R.id.btnQR);

        // Evento del botón para abrir la Activity de escaneo
        botonQR.setOnClickListener(view -> {
            Intent intent = new Intent(Eventos.this, QrScannerActivity.class);
            startActivityForResult(intent, QR_REQUEST_CODE);
        });
    }

    // Aquí recibimos el resultado del QR escaneado
    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == QR_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            String codigoLeido = data.getStringExtra("QR_VALUE");
            if (codigoLeido != null) {
                Toast.makeText(this, "Leído: " + codigoLeido, Toast.LENGTH_LONG).show(); // DEBUG
                // Toast.makeText(this, "Leído: " + codigoLeido, Toast.LENGTH_LONG).show(); 
                // La validación ahora se hace en QrScannerActivity, aquí solo refrescamos si es necesario
                // procesarResultadoQR(codigoLeido.trim());
            }
        }
    }

    private void procesarResultadoQR(String codigoLeido) {
        FirebaseFirestore db = FirebaseFirestore.getInstance();

        db.collection("usuarios")
                .whereEqualTo("QR", codigoLeido)
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    if (!queryDocumentSnapshots.isEmpty()) {
                        DocumentSnapshot alumnoDoc = queryDocumentSnapshots.getDocuments().get(0);
                        String docId = alumnoDoc.getId();
                        Boolean yaEscaneado = alumnoDoc.getBoolean("Escaneo");
                        String nombreAlumno = alumnoDoc.getString("Nombre");

                        if (yaEscaneado != null && yaEscaneado) {
                            Toast.makeText(this, "¡CUIDADO! " + nombreAlumno + " ya ha ingresado.", Toast.LENGTH_LONG).show();
                        } else {
                            confirmarEntrada(docId, nombreAlumno);
                        }
                    } else {
                        Toast.makeText(this, "ERROR: Código QR no registrado.", Toast.LENGTH_LONG).show();
                    }
                })
                .addOnFailureListener(e -> {
                    Toast.makeText(this, "Error de red: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
    }

    private void confirmarEntrada(String idDocumento, String nombre) {
        FirebaseFirestore db = FirebaseFirestore.getInstance();

        db.collection("usuarios").document(idDocumento)
                .update("Escaneo", true)
                .addOnSuccessListener(aVoid -> {
                    Toast.makeText(this, "ACCESO PERMITIDO: " + nombre, Toast.LENGTH_LONG).show();
                })
                .addOnFailureListener(e -> {
                    Toast.makeText(this, "Error al actualizar base de datos.", Toast.LENGTH_SHORT).show();
                });
    }
}