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
import android.graphics.drawable.GradientDrawable;
import com.google.android.material.button.MaterialButton;
import android.graphics.Color;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
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
    private ImageView ivFeedbackIcon, ivBack;
    private TextView tvFeedbackTitle, tvFeedbackDetail, tvFeedbackSeatInfo, tvFeedbackAutoDismiss;
    private View viewFeedbackAccent;
    private MaterialButton btnCerrarFeedback;
    
    private boolean isProcessing = false;
    private FirebaseFirestore db;
    private FirebaseAuth mAuth;
    private String eventId, userEmail;
    private final long SCAN_DELAY_MS = 2500;
    private final Handler feedbackHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ThemeHelper.applyTheme(this);
        LanguageHelper.applyLanguage(this);
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
        viewFeedbackAccent = findViewById(R.id.viewFeedbackAccent);
        ivFeedbackIcon = findViewById(R.id.ivFeedbackIcon);
        tvFeedbackTitle = findViewById(R.id.tvFeedbackTitle);
        tvFeedbackDetail = findViewById(R.id.tvFeedbackDetail);
        tvFeedbackSeatInfo = findViewById(R.id.tvFeedbackSeatInfo);
        tvFeedbackAutoDismiss = findViewById(R.id.tvFeedbackAutoDismiss);
        btnCerrarFeedback = findViewById(R.id.btnCerrarFeedback);
        ivBack = findViewById(R.id.ivBackScanner);

        btnCerrarFeedback.setOnClickListener(v -> {
            hideFeedback();
        });
        
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

    private void showFeedback(boolean isSuccess, String message, String seatInfo) {
        runOnUiThread(() -> {
            feedbackHandler.removeCallbacksAndMessages(null);
            overlayFeedback.setVisibility(View.VISIBLE);
            String[] feedbackText = splitFeedbackMessage(message);
            tvFeedbackTitle.setText(feedbackText[0]);
            tvFeedbackDetail.setText(feedbackText[1]);
            tvFeedbackDetail.setVisibility(feedbackText[1].isEmpty() ? View.GONE : View.VISIBLE);
            
            if (seatInfo != null && !seatInfo.isEmpty()) {
                tvFeedbackSeatInfo.setText(seatInfo);
                tvFeedbackSeatInfo.setVisibility(View.VISIBLE);
            } else {
                tvFeedbackSeatInfo.setVisibility(View.GONE);
            }
            
            int accentColor = Color.parseColor(isSuccess ? "#2E7D32" : "#C62828");
            viewFeedbackAccent.setBackground(createFeedbackAccentDrawable(accentColor));
            ivFeedbackIcon.setImageResource(isSuccess
                    ? android.R.drawable.checkbox_on_background
                    : android.R.drawable.ic_delete);
            ivFeedbackIcon.setColorFilter(accentColor);

            boolean autoMode = getSharedPreferences("QrSettings", MODE_PRIVATE)
                    .getBoolean("auto_mode", true);
            btnCerrarFeedback.setVisibility(autoMode ? View.GONE : View.VISIBLE);
            tvFeedbackAutoDismiss.setVisibility(autoMode ? View.VISIBLE : View.GONE);

            if (autoMode) {
                feedbackHandler.postDelayed(this::hideFeedback, SCAN_DELAY_MS);
            }
        });
    }

    private void hideFeedback() {
        feedbackHandler.removeCallbacksAndMessages(null);
        overlayFeedback.setVisibility(View.GONE);
        isProcessing = false;
    }

    private String[] splitFeedbackMessage(String message) {
        if (message == null) {
            return new String[]{"", ""};
        }

        String[] parts = message.split("\\n", 2);
        String title = parts[0];
        String detail = parts.length > 1 ? parts[1] : "";
        return new String[]{title, detail};
    }

    private GradientDrawable createFeedbackAccentDrawable(int color) {
        float radius = dpToPx(24);
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadii(new float[]{
                radius, radius,
                radius, radius,
                0f, 0f,
                0f, 0f
        });
        return drawable;
    }

    private float dpToPx(float dp) {
        return dp * getResources().getDisplayMetrics().density;
    }

    // Overload for backward compatibility if needed, though we updated all calls
    private void showFeedback(boolean isSuccess, String message) {
        showFeedback(isSuccess, message, null);
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
            showFeedback(false, getString(R.string.feedback_session_error));
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
                        if (code.equals(doc.getId()) || code.equals(doc.getString("id"))) {
                            if (personas != null && !personas.isEmpty()) {
                                found = true;
                                processPersonaMatch(doc, personas, findFirstPendingPersonaIndex(personas));
                                return;
                            }
                        }

                        if (personas != null) {
                            for (int i = 0; i < personas.size(); i++) {
                                Map<String, Object> persona = personas.get(i);
                                String personaQr = getStringFromMap(persona, "qrCode", "id", "QR", "qr");

                                if (code.equals(personaQr)) {
                                    found = true;
                                    processPersonaMatch(doc, personas, i);
                                    return;
                                }
                            }
                        }
                    }
                    if (!found) {
                        showFeedback(false, getString(R.string.feedback_invalid_invitation));
                    }
                })
                .addOnFailureListener(e -> showFeedback(false, getString(R.string.feedback_network_error)));
    }

    private int findFirstPendingPersonaIndex(List<Map<String, Object>> personas) {
        for (int i = 0; i < personas.size(); i++) {
            Object escaneado = personas.get(i).get("escaneado");
            if (!(escaneado instanceof Boolean) || !((Boolean) escaneado)) {
                return i;
            }
        }
        return 0;
    }

    private String getStringFromMap(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            Object value = map.get(key);
            if (value != null) {
                return String.valueOf(value);
            }
        }
        return null;
    }

    private String getTitularName(DocumentSnapshot doc) {
        String nombreMayusculas = doc.getString("NOMBRE");
        if (isValidGuestOwnerName(nombreMayusculas)) {
            return nombreMayusculas;
        }

        String nombreMinusculas = doc.getString("nombre");
        if (isValidGuestOwnerName(nombreMinusculas)) {
            return nombreMinusculas;
        }

        String nombreCapitalizado = doc.getString("Nombre");
        if (isValidGuestOwnerName(nombreCapitalizado)) {
            return nombreCapitalizado;
        }

        return getString(R.string.feedback_unknown_guest);
    }

    private boolean isValidGuestOwnerName(String name) {
        return name != null
                && !name.trim().isEmpty()
                && !getString(R.string.generic_guest_name).equalsIgnoreCase(name.trim());
    }

    private void processPersonaMatch(DocumentSnapshot doc, List<Map<String, Object>> personas, int index) {
        Map<String, Object> persona = personas.get(index);
        Boolean yaEscaneado = (Boolean) persona.get("escaneado");
        String titularName = getTitularName(doc);
        final String guestDisplay = getString(R.string.feedback_guest_of, index + 1, titularName);

        String asiento = doc.getString("asiento");
        if (asiento == null || asiento.trim().isEmpty()) {
            asiento = doc.getString("Asiento");
        }
        final String seatInfo = getString(
                R.string.feedback_seat_format,
                asiento != null && !asiento.trim().isEmpty()
                        ? asiento
                        : getString(R.string.feedback_no_seat)
        );

        if (yaEscaneado != null && yaEscaneado) {
            showFeedback(false, getString(R.string.feedback_already_entered) + "\n" + guestDisplay, seatInfo);
            return;
        }

        // Update status in local list
        persona.put("escaneado", true);
        persona.put("fechaEscaneo", com.google.firebase.Timestamp.now());

        // Update in Firestore
        doc.getReference().update("personas", personas)
                .addOnSuccessListener(aVoid -> {
                    showFeedback(true, getString(R.string.feedback_access_allowed) + "\n" + guestDisplay, seatInfo);
                    updateCapacity();
                    
                    Intent resultIntent = new Intent();
                    resultIntent.putExtra("QR_VALUE", guestDisplay);
                    setResult(RESULT_OK, resultIntent);
                })
                .addOnFailureListener(e -> showFeedback(false, getString(R.string.feedback_save_error)));
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
                    tvAforoQr.setText(getString(R.string.capacity_format, presentes, total));
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
                Toast.makeText(this, R.string.camera_permission_denied, Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }
}
