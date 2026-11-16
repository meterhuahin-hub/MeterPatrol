package th.meterhuahin.meterpatrol;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.ImageFormat;
import android.hardware.Camera;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.Surface;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Native rear-camera scanner. A twice-matched result is submitted automatically through the authenticated browser. */
@SuppressWarnings("deprecation")
public final class BarcodeScannerActivity extends Activity implements SurfaceHolder.Callback, Camera.PreviewCallback {
    private static final int CAMERA_PERMISSION = 41;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean decoding = new AtomicBoolean();
    private final BarcodeDecoder decoder = new BarcodeDecoder();
    private SurfaceView preview;
    private TextView status, number;
    private Button use, permission;
    private Camera camera;
    private boolean resumed, surfaceReady, askedPermission;
    private int generation, lastSeen;
    private long lastFrame;
    private String result, lastValue = "", requestId = "";
    private boolean sending;
    private ScanCallbackTab callbackTab;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (getIntent().hasExtra("completedRequest")) { finish(); return; }
        Uri data = getIntent().getData();
        if (data != null && (!"meterpatrol".equals(data.getScheme()) || !"scan".equals(data.getHost())
                || data.getQueryParameter("request") == null
                || !data.getQueryParameter("request").matches("[A-Za-z0-9-]{16,80}"))) {
            finish();
            return;
        }
        if (data != null) {
            requestId = data.getQueryParameter("request");
            getSharedPreferences("native_scan", MODE_PRIVATE).edit().putString("activeRequest", requestId).apply();
        }
        if (state != null) {
            result = state.getString("confirmedCandidate");
            askedPermission = state.getBoolean("askedPermission");
        }
        createScreen();
        if (result != null) showCandidate(result);
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private Button button(LinearLayout root, String text, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextSize(17);
        button.setAllCaps(false);
        button.setMinHeight(dp(48));
        button.setTextColor(Color.rgb(96, 33, 138));
        button.setOnClickListener(listener);
        root.addView(button, new LinearLayout.LayoutParams(-1, -2));
        return button;
    }

    private void createScreen() {
        final LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(248, 243, 252));
        root.setPadding(dp(16), dp(16), dp(16), dp(16));
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
                root.setPadding(dp(16) + insets.getSystemWindowInsetLeft(), dp(16) + insets.getSystemWindowInsetTop(),
                    dp(16) + insets.getSystemWindowInsetRight(), dp(16) + insets.getSystemWindowInsetBottom());
                return insets;
            }
        });
        TextView title = new TextView(this);
        title.setText("สแกนบาร์โค้ด PEA ด้วยกล้อง APK");
        title.setTextSize(23);
        title.setTextColor(Color.rgb(96, 33, 138));
        root.addView(title);
        status = new TextView(this);
        status.setTextSize(16);
        status.setPadding(0, dp(10), 0, dp(10));
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        root.addView(status);
        preview = new SurfaceView(this);
        preview.getHolder().addCallback(this);
        preview.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View view) {
                if (camera != null) try { camera.autoFocus(null); } catch (RuntimeException ignored) { }
            }
        });
        root.addView(preview, new LinearLayout.LayoutParams(-1, 0, 1));
        number = new TextView(this);
        number.setTextSize(28);
        number.setGravity(android.view.Gravity.CENTER);
        number.setTextIsSelectable(true);
        root.addView(number);
        use = button(root, "ส่งผลอีกครั้ง", new View.OnClickListener() {
            @Override public void onClick(View view) {
                if (result == null) return;
                sendResult();
            }
        });
        use.setVisibility(View.GONE);
        permission = button(root, "อนุญาตกล้อง / เปิดการตั้งค่าสิทธิ์", new View.OnClickListener() {
            @Override public void onClick(View view) {
                if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) openCamera();
                else if (shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) || !askedPermission) askPermission();
                else startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())));
            }
        });
        button(root, "สแกนใหม่", new View.OnClickListener() {
            @Override public void onClick(View view) {
                if (result != null) { finish(); return; }
                result = null; lastValue = ""; lastSeen = 0;
                number.setText(""); use.setVisibility(View.GONE); preview.setVisibility(View.VISIBLE);
                ensureCamera();
            }
        });
        button(root, "ยกเลิก / กลับ", new View.OnClickListener() {
            @Override public void onClick(View view) { finish(); }
        });
        setContentView(root);
    }

    private void askPermission() {
        askedPermission = true;
        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION);
    }

    private void ensureCamera() {
        if (!resumed || result != null) return;
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) openCamera();
        else {
            status.setText("อนุญาตสิทธิ์กล้องให้แอป WBS และ Patrol เพื่อสแกนบาร์โค้ด");
            permission.setVisibility(View.VISIBLE);
            if (!askedPermission) askPermission();
        }
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(code, permissions, grants);
        if (code == CAMERA_PERMISSION) ensureCamera();
    }

    private void openCamera() {
        if (!resumed || !surfaceReady || camera != null || result != null) return;
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) return;
        try {
            int id = 0;
            Camera.CameraInfo info = new Camera.CameraInfo();
            int count = Camera.getNumberOfCameras();
            if (count == 0) { status.setText("ไม่พบกล้องในเครื่องนี้"); return; }
            for (int i = 0; i < count; i++) {
                Camera.getCameraInfo(i, info);
                if (info.facing == Camera.CameraInfo.CAMERA_FACING_BACK) { id = i; break; }
            }
            Camera.getCameraInfo(id, info);
            camera = Camera.open(id);
            Camera.Parameters parameters = camera.getParameters();
            Camera.Size size = null;
            for (Camera.Size candidate : parameters.getSupportedPreviewSizes()) {
                if (candidate.width <= 1280 && candidate.height <= 960
                        && (size == null || candidate.width * candidate.height > size.width * size.height)) size = candidate;
            }
            if (size != null) parameters.setPreviewSize(size.width, size.height);
            parameters.setPreviewFormat(ImageFormat.NV21);
            List<String> modes = parameters.getSupportedFocusModes();
            if (modes != null && modes.contains(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE))
                parameters.setFocusMode(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE);
            else if (modes != null && modes.contains(Camera.Parameters.FOCUS_MODE_AUTO)) parameters.setFocusMode(Camera.Parameters.FOCUS_MODE_AUTO);
            camera.setParameters(parameters);
            int rotation = getWindowManager().getDefaultDisplay().getRotation();
            int degrees = rotation == Surface.ROTATION_90 ? 90 : rotation == Surface.ROTATION_180 ? 180 : rotation == Surface.ROTATION_270 ? 270 : 0;
            int display = info.facing == Camera.CameraInfo.CAMERA_FACING_FRONT
                ? (360 - (info.orientation + degrees) % 360) % 360 : (info.orientation - degrees + 360) % 360;
            camera.setDisplayOrientation(display);
            camera.setPreviewDisplay(preview.getHolder());
            camera.setPreviewCallback(this);
            camera.startPreview();
            permission.setVisibility(View.GONE);
            status.setText("เล็งบาร์โค้ดให้เห็นครบทั้งสองด้าน ถือให้นิ่ง • แตะภาพเพื่อโฟกัส");
        } catch (RuntimeException | IOException unavailable) {
            closeCamera();
            status.setText("เปิดกล้องไม่ได้ กรุณาปิดแอปที่ใช้กล้อง แล้วกดสแกนใหม่");
        }
    }

    @Override public void onPreviewFrame(byte[] data, Camera source) {
        long now = SystemClock.elapsedRealtime();
        if (!resumed || result != null || data == null || now - lastFrame < 250 || !decoding.compareAndSet(false, true)) return;
        lastFrame = now;
        final int requestGeneration = generation;
        final Camera.Size size;
        try { size = source.getParameters().getPreviewSize(); }
        catch (RuntimeException unavailable) { decoding.set(false); return; }
        final byte[] luminance = Arrays.copyOf(data, size.width * size.height);
        worker.execute(new Runnable() {
            @Override public void run() {
                try {
                    final String value = decoder.decode(luminance, size.width, size.height);
                    runOnUiThread(new Runnable() {
                        @Override public void run() {
                            if (!resumed || requestGeneration != generation || result != null || value == null) return;
                            lastSeen = value.equals(lastValue) ? lastSeen + 1 : 1;
                            lastValue = value;
                            if (lastSeen >= 2) showCandidate(value);
                        }
                    });
                } finally { decoding.set(false); }
            }
        });
    }

    private void showCandidate(String value) {
        result = value;
        closeCamera();
        preview.setVisibility(View.GONE);
        permission.setVisibility(View.GONE);
        number.setText("");
        use.setVisibility(View.GONE);
        status.setText("กำลังเติมหมายเลข PEA ในฟอร์มเดิม…");
        sendResult();
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (!requestId.isEmpty() && requestId.equals(intent.getStringExtra("completedRequest"))) finish();
    }

    private void sendResult() {
        if (sending || result == null) return;
        if (requestId.isEmpty()) {
            status.setText("กรุณาเปิดฟอร์ม WBS/Patrol แล้วกดสแกนข้างช่อง PEA เพื่อส่งเลขเข้าแบบอัตโนมัติ");
            return;
        }
        sending = true;
        Uri callback = Uri.parse(MainActivity.WEB_URL).buildUpon()
            .appendQueryParameter("nativePeaRequest", requestId)
            .appendQueryParameter("nativePeaValue", result).build();
        // Prefer the browser that opened this scanner so the same Google account handles the callback.
        Uri referrer = getReferrer();
        java.util.List<android.content.pm.ResolveInfo> providers = getPackageManager().queryIntentServices(
            new Intent("android.support.customtabs.action.CustomTabsService"), 0);
        String provider = null;
        for (android.content.pm.ResolveInfo entry : providers) {
            if (entry.serviceInfo != null && "com.android.chrome".equals(entry.serviceInfo.packageName)) provider = entry.serviceInfo.packageName;
        }
        for (android.content.pm.ResolveInfo entry : providers) {
            if (entry.serviceInfo != null && referrer != null && "android-app".equals(referrer.getScheme())
                    && entry.serviceInfo.packageName.equals(referrer.getHost())) provider = entry.serviceInfo.packageName;
        }
        if (callbackTab != null) callbackTab.close();
        callbackTab = new ScanCallbackTab(this, provider, callback, new Runnable() {
            @Override public void run() {
                if (isFinishing()) return;
                String active = getSharedPreferences("native_scan", MODE_PRIVATE).getString("activeRequest", "");
                if (!requestId.equals(active)) return;
                getSharedPreferences("native_scan", MODE_PRIVATE).edit().remove("activeRequest").apply();
                Intent original = new Intent(BarcodeScannerActivity.this, BarcodeScannerActivity.class);
                original.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NO_ANIMATION);
                original.putExtra("completedRequest", requestId);
                startActivity(original);
                overridePendingTransition(0, 0);
            }
        }, new Runnable() {
            @Override public void run() {
                sending = false;
                status.setText("ส่งผลไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วกดส่งผลอีกครั้ง");
                use.setVisibility(View.VISIBLE);
            }
        });
        callbackTab.open();
    }

    private void closeCamera() {
        generation++;
        if (camera != null) {
            try { camera.setPreviewCallback(null); camera.stopPreview(); } catch (RuntimeException ignored) { }
            camera.release(); camera = null;
        }
    }
    @Override protected void onResume() { super.onResume(); resumed = true; if (preview != null) ensureCamera(); }
    @Override protected void onPause() { resumed = false; closeCamera(); super.onPause(); }
    @Override protected void onDestroy() { closeCamera(); worker.shutdownNow(); if (callbackTab != null) callbackTab.close(); super.onDestroy(); }
    @Override protected void onSaveInstanceState(Bundle state) { super.onSaveInstanceState(state); state.putString("confirmedCandidate", result); state.putBoolean("askedPermission", askedPermission); }
    @Override public void surfaceCreated(SurfaceHolder holder) { surfaceReady = true; ensureCamera(); }
    @Override public void surfaceDestroyed(SurfaceHolder holder) { surfaceReady = false; closeCamera(); }
    @Override public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) { }
}
