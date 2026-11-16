package th.meterhuahin.meterpatrol;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.RemoteException;
import android.support.customtabs.ICustomTabsCallback;
import android.support.customtabs.ICustomTabsService;

/** A separate, observed result tab; closing it never navigates the original form tab. */
final class ScanCallbackTab {
    private final Activity activity;
    private final String provider;
    private final Uri url;
    private final Runnable completed, failed;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private boolean bound, launched, disposed, returning;

    ScanCallbackTab(Activity activity, String provider, Uri url, Runnable completed, Runnable failed) {
        this.activity = activity; this.provider = provider; this.url = url;
        this.completed = completed; this.failed = failed;
    }

    private final ICustomTabsCallback.Stub callback = new ICustomTabsCallback.Stub() {
        @Override public void onNavigationEvent(int event, Bundle extras) {
            if (event == 2) ui.postDelayed(new Runnable() {
                @Override public void run() {
                    if (!disposed && launched && !returning) { returning = true; completed.run(); }
                }
            }, 400);
            else if (event == 3 || event == 4) ui.post(new Runnable() {
                @Override public void run() { if (!disposed && !returning) failed.run(); }
            });
        }
        @Override public void extraCallback(String name, Bundle extras) { }
        @Override public Bundle extraCallbackWithResult(String name, Bundle extras) { return null; }
        @Override public void onMessageChannelReady(Bundle extras) { }
        @Override public void onPostMessage(String message, Bundle extras) { }
        @Override public void onRelationshipValidationResult(int relation, Uri origin, boolean result, Bundle extras) { }
        @Override public void onActivityResized(int height, int width, Bundle extras) { }
        @Override public void onWarmupCompleted(Bundle extras) { }
        @Override public void onActivityLayout(int left, int top, int right, int bottom, int state, Bundle extras) { }
        @Override public void onMinimized(Bundle extras) { }
        @Override public void onUnminimized(Bundle extras) { }
    };

    private final ServiceConnection connection = new ServiceConnection() {
        @Override public void onServiceConnected(ComponentName name, IBinder binder) {
            if (disposed || launched) return;
            try {
                ICustomTabsService service = ICustomTabsService.Stub.asInterface(binder);
                service.warmup(0);
                launch(service.newSession(callback) ? callback.asBinder() : null);
            } catch (RemoteException | RuntimeException unavailable) { launch(null); }
        }
        @Override public void onServiceDisconnected(ComponentName name) { }
    };

    void open() {
        if (provider != null) {
            Intent service = new Intent("android.support.customtabs.action.CustomTabsService").setPackage(provider);
            try { bound = activity.bindService(service, connection, Context.BIND_AUTO_CREATE); }
            catch (RuntimeException unavailable) { bound = false; }
        }
        if (!bound) launch(null);
        else ui.postDelayed(new Runnable() {
            @Override public void run() { if (!disposed && !launched) launch(null); }
        }, 1800);
    }

    private void launch(IBinder session) {
        if (disposed || launched || activity.isFinishing()) return;
        launched = true;
        Intent browser = new Intent(Intent.ACTION_VIEW, url).addCategory(Intent.CATEGORY_BROWSABLE);
        if (provider != null) browser.setPackage(provider);
        Bundle options = new Bundle();
        options.putBinder("android.support.customtabs.extra.SESSION", session);
        browser.putExtras(options);
        browser.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR", 0xff60218a);
        browser.addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        try { activity.startActivity(browser); activity.overridePendingTransition(0, 0); }
        catch (RuntimeException unavailable) { failed.run(); }
    }

    void close() {
        disposed = true;
        ui.removeCallbacksAndMessages(null);
        if (bound) {
            try { activity.unbindService(connection); } catch (RuntimeException ignored) { }
            bound = false;
        }
    }
}
