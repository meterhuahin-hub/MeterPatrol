package th.meterhuahin.meterpatrol;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.List;

/** Opens the existing Apps Script web app in a real browser, never an OAuth WebView. */
public final class MainActivity extends Activity {
    static final String WEB_URL = "https://script.google.com/macros/s/AKfycbx0xCXsuBr2B35QgKyBs-VTLJ9_6oZZqOTp8zbVximNE6y8qLtsNP_1ik_bds4W8Duz/exec";
    private static final String CUSTOM_TABS_SERVICE = "android.support.customtabs.action.CustomTabsService";
    private static final int PURPLE = Color.rgb(96, 33, 138);
    private TextView status;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildHome();
        if (savedInstanceState == null) openSystem();
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openSystem();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private GradientDrawable background(int color) {
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(color);
        shape.setCornerRadius(dp(16));
        return shape;
    }

    private void buildHome() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(248, 243, 252));
        final LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);
        content.setPadding(dp(24), dp(32), dp(24), dp(32));
        scroll.addView(content, new ScrollView.LayoutParams(-1, -2));
        scroll.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
                content.setPadding(dp(24) + insets.getSystemWindowInsetLeft(),
                    dp(32) + insets.getSystemWindowInsetTop(),
                    dp(24) + insets.getSystemWindowInsetRight(),
                    dp(32) + insets.getSystemWindowInsetBottom());
                return insets;
            }
        });
        ImageView icon = new ImageView(this);
        icon.setImageResource(R.mipmap.ic_launcher);
        icon.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dp(100), dp(100));
        iconParams.bottomMargin = dp(20);
        content.addView(icon, iconParams);
        addText(content, R.string.app_title, 26, PURPLE, true);
        addText(content, R.string.app_description, 17, Color.rgb(83, 66, 94), false);
        addButton(content, R.string.open_system, true, new View.OnClickListener() {
            @Override public void onClick(View view) { openSystem(); }
        });
        addButton(content, R.string.other_browser, false, new View.OnClickListener() {
            @Override public void onClick(View view) { chooseBrowser(); }
        });
        addText(content, R.string.browser_help, 16, Color.rgb(83, 66, 94), false);
        addText(content, R.string.account_help, 15, Color.rgb(83, 66, 94), false);
        status = new TextView(this);
        status.setTextColor(Color.rgb(151, 39, 61));
        status.setTextSize(16);
        status.setGravity(Gravity.CENTER);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        content.addView(status, new LinearLayout.LayoutParams(-1, -2));
        addText(content, R.string.version, 13, Color.rgb(116, 99, 126), false);
        setContentView(scroll);
    }

    private void addText(LinearLayout parent, int stringId, int size, int color, boolean bold) {
        TextView text = new TextView(this);
        text.setText(stringId);
        text.setTextSize(size);
        text.setTextColor(color);
        text.setGravity(Gravity.CENTER);
        text.setLineSpacing(dp(3), 1.1f);
        if (bold) text.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.bottomMargin = dp(16);
        parent.addView(text, params);
    }

    private void addButton(LinearLayout parent, int stringId, boolean primary, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(stringId);
        button.setTextSize(18);
        button.setAllCaps(false);
        button.setTextColor(primary ? Color.WHITE : PURPLE);
        button.setBackground(background(primary ? PURPLE : Color.rgb(235, 223, 244)));
        button.setPadding(dp(16), dp(12), dp(16), dp(12));
        button.setMinHeight(dp(56));
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.bottomMargin = dp(12);
        parent.addView(button, params);
    }

    private Intent webIntent() {
        return new Intent(Intent.ACTION_VIEW, Uri.parse(WEB_URL)).addCategory(Intent.CATEGORY_BROWSABLE);
    }

    private String customTabsProvider() {
        List<ResolveInfo> providers = getPackageManager().queryIntentServices(new Intent(CUSTOM_TABS_SERVICE), 0);
        for (ResolveInfo provider : providers) {
            if (provider.serviceInfo != null && "com.android.chrome".equals(provider.serviceInfo.packageName)) {
                return provider.serviceInfo.packageName;
            }
        }
        ResolveInfo defaultBrowser = getPackageManager().resolveActivity(webIntent(), 0);
        for (ResolveInfo provider : providers) {
            if (provider.serviceInfo != null && defaultBrowser != null && defaultBrowser.activityInfo != null
                    && provider.serviceInfo.packageName.equals(defaultBrowser.activityInfo.packageName)) {
                return provider.serviceInfo.packageName;
            }
        }
        for (ResolveInfo provider : providers) {
            if (provider.serviceInfo != null) return provider.serviceInfo.packageName;
        }
        return null;
    }

    private void openSystem() {
        status.setText("");
        Intent intent = webIntent();
        String provider = customTabsProvider();
        if (provider != null) {
            intent.setPackage(provider);
            Bundle customTab = new Bundle();
            customTab.putBinder("android.support.customtabs.extra.SESSION", null);
            intent.putExtras(customTab);
            intent.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR", PURPLE);
            intent.putExtra("android.support.customtabs.extra.TITLE_VISIBILITY", 1);
        }
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException | SecurityException unavailable) {
            if (provider != null) {
                try { startActivity(webIntent()); return; }
                catch (ActivityNotFoundException | SecurityException ignored) { /* Show the recovery action. */ }
            }
            status.setText(R.string.no_browser);
        }
    }

    private void chooseBrowser() {
        try { startActivity(Intent.createChooser(webIntent(), getString(R.string.other_browser))); }
        catch (ActivityNotFoundException | SecurityException unavailable) { status.setText(R.string.no_browser); }
    }
}
