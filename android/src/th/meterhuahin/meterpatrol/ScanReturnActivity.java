package th.meterhuahin.meterpatrol;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/** Removes the callback tab and scanner, revealing the original browser form below them. */
public final class ScanReturnActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Uri uri = getIntent().getData();
        String request = uri == null ? null : uri.getQueryParameter("request");
        String active = getSharedPreferences("native_scan", MODE_PRIVATE).getString("activeRequest", "");
        if (uri != null && "meterpatrol".equals(uri.getScheme()) && "resume".equals(uri.getHost())
                && request != null && request.matches("[A-Za-z0-9-]{16,80}") && request.equals(active)) {
            getSharedPreferences("native_scan", MODE_PRIVATE).edit().remove("activeRequest").apply();
            Intent scanner = new Intent(this, BarcodeScannerActivity.class);
            scanner.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            scanner.putExtra("completedRequest", request);
            startActivity(scanner);
        }
        finish();
    }
}
