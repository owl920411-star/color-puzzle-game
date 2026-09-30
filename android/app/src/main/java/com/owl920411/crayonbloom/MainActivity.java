package com.owl920411.crayonbloom;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Build;
import android.graphics.Color;
import android.graphics.Insets;
import android.view.WindowInsets;
import android.webkit.*;
import android.net.Uri;
import android.widget.FrameLayout;
import android.content.SharedPreferences;
import androidx.webkit.WebViewAssetLoader;
import com.google.android.gms.ads.*;
import com.google.android.gms.ads.interstitial.*;
import com.google.android.ump.*;
import java.io.ByteArrayInputStream;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    // Publisher-provided production app/interstitial IDs.
    private static final String INTERSTITIAL_ID = "ca-app-pub-5315201053842908/4383534846";
    private static final boolean TEST_ADS = false; // Never bypass consent for publisher ads.
    private WebView web;
    private SharedPreferences prefs;
    private AdCadence cadence;
    private InterstitialAd interstitial;
    private boolean resumed, showing, loading, adsInitialized, eligibleRun, terminal = true;
    private ConsentInformation consent;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("ad-cadence-v1", MODE_PRIVATE);
        cadence = new AdCadence(prefs.getInt("games",0));
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(255,247,232));
        root.setOnApplyWindowInsetsListener((view,insets) -> {
            if(Build.VERSION.SDK_INT >= 30) {
                Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(i.left,i.top,i.right,i.bottom);
            } else view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        web = new WebView(this);
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false); s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true);
        WebView.setWebContentsDebuggingEnabled(false);
        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r) {
                WebResourceResponse local = assets.shouldInterceptRequest(r.getUrl());
                if(local != null) return local;
                return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r) {
                return !r.getUrl().toString().startsWith(ORIGIN+"/assets/game/");
            }
            @Override public void onPageFinished(WebView v,String url) {
                if(!resumed) js("window.dispatchEvent(new Event('blur'));window.BloomAudio?.scene('paused')");
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new AdsBridge(),"CrayonAndroid");
        web.loadUrl(ORIGIN+"/assets/game/index.html");
        consent = UserMessagingPlatform.getConsentInformation(this);
        // Conservative ad treatment for the intended teen/adult audience: never request personalized ads.
        MobileAds.setRequestConfiguration(new RequestConfiguration.Builder()
            .setTagForUnderAgeOfConsent(RequestConfiguration.TAG_FOR_UNDER_AGE_OF_CONSENT_TRUE)
            .setMaxAdContentRating(RequestConfiguration.MAX_AD_CONTENT_RATING_PG).build());
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().setTagForUnderAgeOfConsent(true).build();
        consent.requestConsentInfoUpdate(this,params,
            () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(this,error -> initializeAdsIfAllowed()),
            error -> initializeAdsIfAllowed());
        initializeAdsIfAllowed();
    }
    private void initializeAdsIfAllowed() {
        if(adsInitialized || (!TEST_ADS && !consent.canRequestAds())) return;
        adsInitialized = true;
        MobileAds.initialize(this,status -> runOnUiThread(this::preload));
    }
    private void preload() {
        if(!resumed || !adsInitialized || loading || showing || interstitial != null || isFinishing()) return;
        loading = true;
        Bundle extras = new Bundle(); extras.putString("npa","1");
        AdRequest request = new AdRequest.Builder().addNetworkExtrasBundle(com.google.ads.mediation.admob.AdMobAdapter.class,extras).build();
        InterstitialAd.load(this,INTERSTITIAL_ID,request,new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(InterstitialAd ad) { loading = false; interstitial = ad; }
            @Override public void onAdFailedToLoad(LoadAdError error) { loading = false; interstitial = null; }
        });
    }
    private void persist() { prefs.edit().putInt("games",cadence.games()).remove("activeMs").apply(); }
    private void js(String script) { if(web != null) web.evaluateJavascript(script,null); }
    private void releaseResult() { showing = false;js("window.CrayonNativeAds?.setBusy(false)");preload(); }
    private void result() {
        if(terminal) { if(!showing) releaseResult();return; }
        terminal = true;
        if(!eligibleRun) { releaseResult();return; }
        cadence.finish();persist();
        if(!resumed || isFinishing() || !cadence.eligible() || interstitial == null || (!TEST_ADS && !consent.canRequestAds())) { releaseResult();return; }
        InterstitialAd ad = interstitial;interstitial = null;showing = true;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdShowedFullScreenContent() { cadence.shown();persist(); }
            @Override public void onAdDismissedFullScreenContent() { releaseResult(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError e) { releaseResult(); }
        });
        try { ad.show(this); } catch(RuntimeException error) { releaseResult(); }
    }
    private final class AdsBridge {
        @JavascriptInterface public void beginGame(boolean eligible) { runOnUiThread(() -> { eligibleRun = eligible;terminal = false;preload(); }); }
        @JavascriptInterface public void endGame(boolean eligible) { runOnUiThread(() -> { eligibleRun &= eligible;result(); }); }
    }
    @Override protected void onResume() { super.onResume();resumed = true;if(web != null) { web.onResume();js("window.dispatchEvent(new Event('crayon-native-resume'))"); } if(consent != null) preload(); }
    @Override protected void onPause() { resumed = false;if(web != null) { js("window.dispatchEvent(new Event('blur'));window.BloomAudio?.scene('paused')");web.onPause(); }persist();super.onPause(); }
    @Override public void onBackPressed() {
        if(showing) return;
        js("window.dispatchEvent(new Event('blur'))");
        new AlertDialog.Builder(this).setMessage("놀이를 마칠까요?")
            .setNegativeButton("계속하기",(d,w) -> {})
            .setPositiveButton("종료",(d,w) -> finish()).show();
    }
    @Override protected void onDestroy() { if(web != null) { web.removeJavascriptInterface("CrayonAndroid");web.destroy();web = null; }super.onDestroy(); }
}
