package com.ataimobil

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        assetLoader = WebViewAssetLoader.Builder()
            .setDomain(APP_ASSET_DOMAIN)
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this)
        webView.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            userAgentString = "$userAgentString AT-AI-Mobil-Android/0.1"
        }

        webView.addJavascriptInterface(AndroidBridge(this), "ATAndroidBridge")
        webView.webViewClient = LocalAssetWebViewClient(assetLoader)

        setContentView(webView)
        webView.loadUrl("https://$APP_ASSET_DOMAIN/index.html")
    }

    @Deprecated("Deprecated in Android SDK, still fine for minSdk 24 WebView back support.")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    private class LocalAssetWebViewClient(
        private val assetLoader: WebViewAssetLoader
    ) : WebViewClient() {
        override fun shouldInterceptRequest(
            view: WebView,
            request: WebResourceRequest
        ): WebResourceResponse? {
            return assetLoader.shouldInterceptRequest(request.url)
        }

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url.toString()
            if (url.startsWith("https://$APP_ASSET_DOMAIN/")) return false
            view.loadUrl(url)
            return true
        }
    }

    class AndroidBridge(context: Context) {
        private val prefs = context.getSharedPreferences("at_ai_android", Context.MODE_PRIVATE)

        @JavascriptInterface
        fun getApiBaseUrl(): String {
            return prefs.getString(API_BASE_KEY, DEFAULT_API_BASE_URL) ?: DEFAULT_API_BASE_URL
        }

        @JavascriptInterface
        fun setApiBaseUrl(value: String) {
            val cleaned = value.trim().trimEnd('/')
            require(cleaned.startsWith("https://")) { "API adresi https ile baslamali." }
            prefs.edit().putString(API_BASE_KEY, cleaned).apply()
        }

        @JavascriptInterface
        fun fetch(pathOrUrl: String, initJson: String): String {
            return try {
                val init = JSONObject(if (initJson.isBlank()) "{}" else initJson)
                val target = resolveUrl(pathOrUrl)
                val method = init.optString("method", "GET").ifBlank { "GET" }
                    .uppercase(Locale.US)
                val body = init.optString("body", "")

                val connection = (URL(target).openConnection() as HttpURLConnection).apply {
                    requestMethod = method
                    connectTimeout = 60_000
                    readTimeout = 180_000
                    instanceFollowRedirects = true
                    setRequestProperty("Accept", "application/json, text/plain, */*")
                    setRequestProperty("Accept-Language", "tr-TR,tr;q=0.9,en;q=0.7")
                    setRequestProperty(
                        "User-Agent",
                        "Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 Chrome Mobile AT-AI-Mobil-Android/0.1"
                    )

                    val headers = init.optJSONObject("headers")
                    if (headers != null) {
                        val keys = headers.keys()
                        while (keys.hasNext()) {
                            val key = keys.next()
                            val value = headers.optString(key, "")
                            if (key.isNotBlank() && value.isNotBlank()) setRequestProperty(key, value)
                        }
                    }

                    if (method != "GET" && method != "HEAD" && body.isNotEmpty()) {
                        doOutput = true
                        if (getRequestProperty("Content-Type").isNullOrBlank()) {
                            setRequestProperty("Content-Type", "application/json; charset=utf-8")
                        }
                        outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                    }
                }

                val status = connection.responseCode
                val stream = if (status in 200..399) connection.inputStream else connection.errorStream
                val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()

                JSONObject()
                    .put("ok", status in 200..299)
                    .put("status", status)
                    .put("statusText", connection.responseMessage.orEmpty())
                    .put("url", target)
                    .put(
                        "headers",
                        JSONObject()
                            .put("content-type", connection.contentType ?: "application/json; charset=utf-8")
                    )
                    .put("body", text)
                    .toString()
            } catch (error: Throwable) {
                JSONObject()
                    .put("ok", false)
                    .put("status", 599)
                    .put("statusText", "Android bridge error")
                    .put("headers", JSONObject().put("content-type", "application/json; charset=utf-8"))
                    .put(
                        "body",
                        JSONObject()
                            .put("ok", false)
                            .put("error", error.message ?: error.toString())
                            .toString()
                    )
                    .toString()
            }
        }

        private fun resolveUrl(pathOrUrl: String): String {
            val raw = pathOrUrl.trim()
            if (raw.startsWith("https://")) return raw
            if (raw.startsWith("http://")) error("Yalniz https API adresi desteklenir.")

            val base = getApiBaseUrl().trimEnd('/')
            val path = when {
                raw.startsWith("/") -> raw
                else -> "/$raw"
            }
            return Uri.parse(base + path).toString()
        }
    }

    companion object {
        private const val APP_ASSET_DOMAIN = "appassets.androidplatform.net"
        private const val API_BASE_KEY = "api_base_url"
        private const val DEFAULT_API_BASE_URL = "https://at-ai-mobil.vercel.app"
    }
}
