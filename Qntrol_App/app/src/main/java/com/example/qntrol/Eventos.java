package com.example.qntrol;

import android.os.Bundle;
import android.util.Log;
import com.google.android.material.button.MaterialButton;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

// Imports de Firebase y Google Scanner
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

public class Eventos extends AppCompatActivity {

    MaterialButton botonQR;
    GmsBarcodeScanner scanner;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_eventos);

        botonQR = findViewById(R.id.btnQR);

        // 1. CONFIGURACIÓN DEL SCANNER (Google Code Scanner)
        GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build();

        scanner = GmsBarcodeScanning.getClient(this, options);

        // 2. EVENTO DEL BOTÓN
        botonQR.setOnClickListener(view -> {
            // Iniciamos el escaneo directamente
            scanner.startScan()
                    .addOnSuccessListener(barcode -> {
                        String resultadoQR = barcode.getRawValue();
                        if (resultadoQR != null) {
                            try {
                                String codigoLimpio = resultadoQR.trim(); // Limpiamos espacios
                                Toast.makeText(this, "Leído: " + codigoLimpio, Toast.LENGTH_LONG).show(); // DEBUG
                                procesarResultadoQR(codigoLimpio);
                            } catch (Exception e) {
                                Log.e("QR_process_error", "Error processing QR: " + e.getMessage());
                                Toast.makeText(this, "Error procesando QR: " + e.getMessage(), Toast.LENGTH_LONG).show();
                            }
                        }
                    })
                    .addOnCanceledListener(() -> {
                        Toast.makeText(this, "Escaneo cancelado", Toast.LENGTH_SHORT).show();
                    })
                    .addOnFailureListener(e -> {
                        Log.e("QR_ERROR", e.getMessage());
                        Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    });
        });
    }

    private void procesarResultadoQR(String codigoLeido) {
        FirebaseFirestore db = FirebaseFirestore.getInstance();

        // Buscamos en la colección "Alumno" por el campo "QR"
        db.collection("Alumno")
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

        db.collection("Alumno").document(idDocumento)
                .update("Escaneo", true)
                .addOnSuccessListener(aVoid -> {
                    Toast.makeText(this, "ACCESO PERMITIDO: " + nombre, Toast.LENGTH_LONG).show();
                })
                .addOnFailureListener(e -> {
                    Toast.makeText(this, "Error al actualizar base de datos.", Toast.LENGTH_SHORT).show();
                });
    }
}