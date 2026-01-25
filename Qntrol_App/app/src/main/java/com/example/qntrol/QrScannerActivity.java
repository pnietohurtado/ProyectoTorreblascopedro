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
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;

import java.util.List;
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
        db.collection("usuarios")
                .whereEqualTo("QR", code)
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    if (!queryDocumentSnapshots.isEmpty()) {
                        DocumentSnapshot alumnoDoc = queryDocumentSnapshots.getDocuments().get(0);
                        String docId = alumnoDoc.getId();
                        Boolean yaEscaneado = alumnoDoc.getBoolean("Escaneo");
                        String nombreAlumno = alumnoDoc.getString("Nombre");
                        
                        // Fallback si no tiene nombre
                        if (nombreAlumno == null) {
                            nombreAlumno = docId;
                        }

                        if (yaEscaneado != null && yaEscaneado) {
                            showFeedback(false, "YA INGRESADO\n" + nombreAlumno);
                        } else {
                            confirmEntry(docId, nombreAlumno);
                        }
                    } else {
                        showFeedback(false, "CÓDIGO NO VÁLIDO");
                    }
                })
                .addOnFailureListener(e -> {
                    showFeedback(false, "ERROR DE RED");
                });
    }

    private void confirmEntry(String docId, String nombre) {
        db.collection("usuarios").document(docId)
                .update("Escaneo", true)
                .addOnSuccessListener(aVoid -> {
                    showFeedback(true, "ACCESO PERMITIDO\n" + nombre);
                    updateCapacity();
                })
                .addOnFailureListener(e -> {
                    showFeedback(false, "ERROR AL GUARDAR");
                });
    }

    private void updateCapacity() {
        db.collection("usuarios")
                .whereEqualTo("Escaneo", true)
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    int currentCount = queryDocumentSnapshots.size();
                    tvAforoQr.setText("Aforo: " + currentCount + "/" + MAX_CAPACITY);
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
