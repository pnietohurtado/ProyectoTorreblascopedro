package com.example.qntrol;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.os.Handler;
import android.os.Looper;
import android.widget.ImageView;
import android.widget.TextView;
import android.view.View;
import android.widget.RelativeLayout;
import android.widget.LinearLayout;
import android.content.res.ColorStateList;
import android.graphics.Color;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

public class QrScannerActivity extends AppCompatActivity {

    private PreviewView previewView;
    private BarcodeScanner scanner;
    private final int CAMERA_PERMISSION_REQUEST = 101;
    
    // UI Elements
    private TextView tvAforoQr;
    private RelativeLayout overlayFeedback;
    private LinearLayout cardFeedback;
    private ImageView ivFeedbackIcon;
    private TextView tvFeedbackMessage;
    
    private boolean isProcessing = false; // Evitar múltiples escaneos simultáneos
    private FirebaseFirestore db;
    private FirebaseAuth mAuth;
    private final int MAX_CAPACITY = 1200;
    private final long SCAN_DELAY_MS = 3000; // Tiempo de espera antes de volver a escanear

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_qr_scanner);

        previewView = findViewById(R.id.previewView);
        tvAforoQr = findViewById(R.id.tvAforoQr);
        overlayFeedback = findViewById(R.id.overlayFeedback);
        cardFeedback = findViewById(R.id.cardFeedback);
        ivFeedbackIcon = findViewById(R.id.ivFeedbackIcon);
        tvFeedbackMessage = findViewById(R.id.tvFeedbackMessage);
        
        scanner = BarcodeScanning.getClient(); // ML Kit Scanner
        db = FirebaseFirestore.getInstance();
        mAuth = FirebaseAuth.getInstance();
        
        updateCapacity(); // Inicializar aforo

        // Revisar permisos de cámara
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.CAMERA},
                    CAMERA_PERMISSION_REQUEST);
        } else {
            startCamera();
        }
    }
    

    
    private void showFeedback(boolean isSuccess, String message) {
        runOnUiThread(() -> {
            overlayFeedback.setVisibility(View.VISIBLE);
            tvFeedbackMessage.setText(message);
            
            if (isSuccess) {
                // Verde oscuro/sólido para el cartel
                cardFeedback.setBackgroundTintList(ColorStateList.valueOf(Color.parseColor("#2E7D32"))); 
                ivFeedbackIcon.setImageResource(android.R.drawable.checkbox_on_background);
            } else {
                // Rojo oscuro/sólido para el cartel
                cardFeedback.setBackgroundTintList(ColorStateList.valueOf(Color.parseColor("#C62828")));
                ivFeedbackIcon.setImageResource(android.R.drawable.ic_delete);
            }

            // Ocultar después del tiempo definido y reactivar escaneo
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                overlayFeedback.setVisibility(View.GONE);
                isProcessing = false;
            }, SCAN_DELAY_MS);
        });
    }

    // Iniciar CameraX
    private void startCamera() {
        Log.d("QrScannerActivity", "Starting camera...");
        ListenableFuture<ProcessCameraProvider> cameraProviderFuture =
                ProcessCameraProvider.getInstance(this);

        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();

                // Preview
                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());

                // Image analysis para QR
                ImageAnalysis imageAnalysis = new ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build();

                imageAnalysis.setAnalyzer(ContextCompat.getMainExecutor(this), this::analyzeImage);

                // Selección de cámara trasera
                CameraSelector cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA;

                // Bindeo al ciclo de vida
                cameraProvider.unbindAll();
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageAnalysis);

            } catch (ExecutionException | InterruptedException e) {
                Log.e("QrScannerActivity", "Error starting camera", e);
                e.printStackTrace();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    // Analizar cada frame de la cámara
    private void analyzeImage(ImageProxy imageProxy) {
        if (imageProxy.getImage() != null) {
            InputImage image = InputImage.fromMediaImage(
                    imageProxy.getImage(),
                    imageProxy.getImageInfo().getRotationDegrees()
            );

            scanner.process(image)
                    .addOnSuccessListener(this::processBarcodes)
                    .addOnFailureListener(e -> {
                        Log.e("QrScannerActivity", "Scanner processing failed", e);
                        e.printStackTrace();
                    })
                    .addOnCompleteListener(task -> {
                        imageProxy.close();
                    });
        } else {
            imageProxy.close();
        }
    }

    // Procesar los QR detectados
    private void processBarcodes(List<Barcode> barcodes) {
        if (isProcessing) return; // Si ya estamos procesando uno, ignorar

        for (Barcode barcode : barcodes) {
            String rawValue = barcode.getRawValue();
            if (rawValue != null) {
                isProcessing = true;
                validateQr(rawValue.trim());
                return;
            }
        }
    }

    private void validateQr(String code) {
        if (mAuth.getCurrentUser() == null) {
            showFeedback(false, "USUARIO NO IDENTIFICADO");
            return;
        }

        String userId = mAuth.getUid();

        // Buscamos en todos los invitados que pertenezcan a este usuario (organizador)
        db.collectionGroup("invitados")
                .whereEqualTo("uid", userId)
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    Log.d("QrScannerActivity", "Documentos encontrados: " + queryDocumentSnapshots.size());
                    boolean found = false;
                    for (DocumentSnapshot guestDoc : queryDocumentSnapshots) {
                        List<Map<String, Object>> personas = (List<Map<String, Object>>) guestDoc.get("personas");
                        if (personas != null) {
                            for (int i = 0; i < personas.size(); i++) {
                                Map<String, Object> persona = personas.get(i);
                                String personaQr = (String) persona.get("qrCode");

                                if (code.equals(personaQr)) {
                                    found = true;
                                    processPersonaMatch(guestDoc, personas, i);
                                    return;
                                }
                            }
                        }
                    }
                    if (!found) {
                        Log.w("QrScannerActivity", "Código QR no encontrado en ningún documento: " + code);
                        showFeedback(false, "CÓDIGO NO VÁLIDO");
                    }
                })
                .addOnFailureListener(e -> {
                    Log.e("QrScannerActivity", "Error crítico en Firebase: ", e);
                    // Esto nos dirá si es falta de índice o de permisos
                    showFeedback(false, "ERROR DE RED\n" + e.getMessage());
                });
    }

    private void processPersonaMatch(DocumentSnapshot guestDoc, List<Map<String, Object>> personas, int index) {
        Map<String, Object> persona = personas.get(index);
        String nombre = (String) persona.get("nombre");
        Boolean yaEscaneado = (Boolean) persona.get("escaneado");

        if (yaEscaneado != null && yaEscaneado) {
            showFeedback(false, "YA INGRESADO\n" + nombre);
            return;
        }

        // Marcar como escaneado en el objeto de la lista
        persona.put("escaneado", true);
        persona.put("fechaEscaneo", com.google.firebase.Timestamp.now());

        // Referencias para la actualización jerárquica
        DocumentReference guestRef = guestDoc.getReference();
        DocumentReference eventRef = guestRef.getParent().getParent();

        // Usamos una transacción para asegurar que los contadores se actualicen correctamente
        db.runTransaction(transaction -> {
            // 1. Actualizar la lista de personas dentro del invitado
            transaction.update(guestRef, "personas", personas);
            
            // 2. Incrementar personasEscaneadas en el documento del invitado
            transaction.update(guestRef, "personasEscaneadas", FieldValue.increment(1));
            
            // 3. Incrementar personasEscaneadas en el documento del evento (padre del invitado)
            transaction.update(eventRef, "personasEscaneadas", FieldValue.increment(1));
            
            return null;
        }).addOnSuccessListener(aVoid -> {
            showFeedback(true, "ACCESO PERMITIDO\n" + nombre);
            updateCapacity();
        }).addOnFailureListener(e -> {
            Log.e("QrScannerActivity", "Error en transacción", e);
            showFeedback(false, "ERROR AL GUARDAR");
        });
    }

    private void updateCapacity() {
        if (mAuth.getCurrentUser() == null) return;

        // Para mostrar el aforo total de todos los eventos de este usuario
        db.collectionGroup("invitados")
                .whereEqualTo("uid", mAuth.getUid())
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    long totalEscaneados = 0;
                    for (DocumentSnapshot doc : queryDocumentSnapshots) {
                        Long count = doc.getLong("personasEscaneadas");
                        if (count != null) {
                            totalEscaneados += count;
                        }
                    }
                    tvAforoQr.setText("Aforo: " + totalEscaneados + "/" + MAX_CAPACITY);
                });
    }



    // Manejo de permisos
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startCamera();
            } else {
                Toast.makeText(this, "Permiso de cámara denegado", Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }
}
