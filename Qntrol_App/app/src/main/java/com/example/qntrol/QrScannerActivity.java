package com.example.qntrol;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ExperimentalGetImage;
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
import com.google.firebase.auth.FirebaseUser;
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
    private ImageView ivFeedbackIcon, ivBack;
    private TextView tvFeedbackMessage;
    
    private boolean isProcessing = false;
    private FirebaseFirestore db;
    private FirebaseAuth mAuth;
    private String eventId, userEmail;
    private final long SCAN_DELAY_MS = 2500;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ThemeHelper.applyTheme(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_qr_scanner);

        db = FirebaseFirestore.getInstance();
        mAuth = FirebaseAuth.getInstance();
        
        FirebaseUser user = mAuth.getCurrentUser();
        if (user != null) {
            userEmail = user.getEmail();
        }

        eventId = getIntent().getStringExtra("EVENT_ID");

        previewView = findViewById(R.id.previewView);
        tvAforoQr = findViewById(R.id.tvAforoQr);
        overlayFeedback = findViewById(R.id.overlayFeedback);
        cardFeedback = findViewById(R.id.cardFeedback);
        ivFeedbackIcon = findViewById(R.id.ivFeedbackIcon);
        tvFeedbackMessage = findViewById(R.id.tvFeedbackMessage);
        ivBack = findViewById(R.id.ivBackScanner);
        
        ivBack.setOnClickListener(v -> finish());
        
        scanner = BarcodeScanning.getClient();
        
        updateCapacity();

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
                // Soft elegant green
                cardFeedback.setBackgroundTintList(ColorStateList.valueOf(Color.parseColor("#43A047"))); 
                ivFeedbackIcon.setImageResource(android.R.drawable.checkbox_on_background);
            } else {
                // Soft elegant coral/red
                cardFeedback.setBackgroundTintList(ColorStateList.valueOf(Color.parseColor("#E57373")));
                ivFeedbackIcon.setImageResource(android.R.drawable.ic_delete);
            }

            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                overlayFeedback.setVisibility(View.GONE);
                isProcessing = false;
            }, SCAN_DELAY_MS);
        });
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> cameraProviderFuture =
                ProcessCameraProvider.getInstance(this);

        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();
                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());

                ImageAnalysis imageAnalysis = new ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build();

                imageAnalysis.setAnalyzer(ContextCompat.getMainExecutor(this), this::analyzeImage);
                CameraSelector cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA;

                cameraProvider.unbindAll();
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageAnalysis);

            } catch (ExecutionException | InterruptedException e) {
                Log.e("QrScannerActivity", "Error starting camera", e);
            }
        }, ContextCompat.getMainExecutor(this));
    }

    // Analizar cada frame de la cámara
    @OptIn(markerClass = ExperimentalGetImage.class)
    private void analyzeImage(ImageProxy imageProxy) {
        if (imageProxy.getImage() != null) {
            InputImage image = InputImage.fromMediaImage(
                    imageProxy.getImage(),
                    imageProxy.getImageInfo().getRotationDegrees()
            );

            scanner.process(image)
                    .addOnSuccessListener(this::processBarcodes)
                    .addOnFailureListener(e -> imageProxy.close())
                    .addOnCompleteListener(task -> imageProxy.close());
        } else {
            imageProxy.close();
        }
    }

    private void processBarcodes(List<Barcode> barcodes) {
        if (isProcessing) return;
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
        if (userEmail == null || eventId == null) {
            showFeedback(false, "ERROR DE SESIÓN");
            return;
        }

        // Search for the guest document that has this QR in its 'personas' array
        db.collection("usuarios")
                .document(userEmail)
                .collection("eventos")
                .document(eventId)
                .collection("invitados")
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    boolean found = false;
                    for (DocumentSnapshot doc : queryDocumentSnapshots) {
                        List<Map<String, Object>> personas = (List<Map<String, Object>>) doc.get("personas");
                        if (personas != null) {
                            for (int i = 0; i < personas.size(); i++) {
                                Map<String, Object> persona = personas.get(i);
                                String personaQr = (String) persona.get("qrCode");

                                if (code.equals(personaQr)) {
                                    found = true;
                                    processPersonaMatch(doc, personas, i);
                                    return;
                                }
                            }
                        }
                    }
                    if (!found) {
                        showFeedback(false, "INVITACIÓN NO VÁLIDA");
                    }
                })
                .addOnFailureListener(e -> showFeedback(false, "ERROR DE RED"));
    }

    private void processPersonaMatch(DocumentSnapshot doc, List<Map<String, Object>> personas, int index) {
        Map<String, Object> persona = personas.get(index);
        Boolean yaEscaneado = (Boolean) persona.get("escaneado");
        String titularName = doc.getString("nombre");
        String guestDisplay = "Invitado " + (index + 1) + " de " + (titularName != null ? titularName : "Desconocido");

        if (yaEscaneado != null && yaEscaneado) {
            showFeedback(false, "YA INGRESADO\n" + guestDisplay);
            return;
        }

        // Update status in local list
        persona.put("escaneado", true);
        persona.put("fechaEscaneo", com.google.firebase.Timestamp.now());

        // Update in Firestore
        doc.getReference().update("personas", personas)
                .addOnSuccessListener(aVoid -> {
                    showFeedback(true, "ACCESO PERMITIDO\n" + guestDisplay);
                    updateCapacity();
                    
                    // Trigger haptic feedback or sound if needed? For now just UI
                    Intent resultIntent = new Intent();
                    resultIntent.putExtra("QR_VALUE", guestDisplay);
                    setResult(RESULT_OK, resultIntent);
                })
                .addOnFailureListener(e -> showFeedback(false, "ERROR AL GUARDAR"));
    }

    private void updateCapacity() {
        if (userEmail == null || eventId == null) return;

        db.collection("usuarios")
                .document(userEmail)
                .collection("eventos")
                .document(eventId)
                .collection("invitados")
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    int total = 0;
                    int presentes = 0;
                    for (DocumentSnapshot doc : queryDocumentSnapshots) {
                        List<Map<String, Object>> personas = (List<Map<String, Object>>) doc.get("personas");
                        if (personas != null) {
                            total += personas.size();
                            for (Map<String, Object> p : personas) {
                                if (p.get("escaneado") != null && (boolean) p.get("escaneado")) presentes++;
                            }
                        }
                    }
                    tvAforoQr.setText("Aforo: " + presentes + "/" + total);
                });
    }

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
