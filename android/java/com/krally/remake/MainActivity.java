package com.krally.remake;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.util.Log;

public class MainActivity extends Activity {
    private WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(true);
        s.setSupportMultipleWindows(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);

        WebView.setWebContentsDebuggingEnabled(true);
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage cm) {
                Log.i("KRALLY_JS", cm.messageLevel() + ": " + cm.message() + " @" + cm.lineNumber());
                return true;
            }
        });
        web.setBackgroundColor(0xFF08090F);
        // 设备 GPU 在绘制大尺寸 canvas 时会 SIGSEGV（Chrome_InProcGp），改用软件渲染保证稳定
        web.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);
        hideSystemBars();
    }

    private void hideSystemBars() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override
    public void onWindowFocusChanged(boolean has) {
        super.onWindowFocusChanged(has);
        if (has) hideSystemBars();
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
