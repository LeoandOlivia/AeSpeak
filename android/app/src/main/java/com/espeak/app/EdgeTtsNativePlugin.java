package com.espeak.app;

import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;

@CapacitorPlugin(name = "EdgeTtsNative")
public class EdgeTtsNativePlugin extends Plugin {

    private static final String TRUSTED = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
    private static final String WSS =
        "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
    private static final String GEC_VERSION = "1-143.0.3650.75";
    private static final String USER_AGENT =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0";
    private static final String ORIGIN = "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold";

    @PluginMethod
    public void synthesize(PluginCall call) {
        String text = call.getString("text", "").trim();
        String voice = call.getString("voice", "en-US-JennyNeural");
        if (text.isEmpty()) {
            call.reject("text required");
            return;
        }

        new Thread(() -> {
            try {
                byte[] audio = synthesizeAudio(text, voice);
                String base64 = Base64.encodeToString(audio, Base64.NO_WRAP);
                JSObject ret = new JSObject();
                ret.put("base64", base64);
                ret.put("mimeType", "audio/mpeg");
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Edge TTS failed: " + e.getMessage());
            }
        }).start();
    }

    private byte[] synthesizeAudio(String text, String voice) throws Exception {
        String requestId = UUID.randomUUID().toString();
        String gec = generateSecMsGec();
        String url =
            WSS
                + "?TrustedClientToken="
                + TRUSTED
                + "&Sec-MS-GEC="
                + gec
                + "&Sec-MS-GEC-Version="
                + GEC_VERSION
                + "&ConnectionId="
                + requestId;

        OkHttpClient client =
            new OkHttpClient.Builder().readTimeout(30, TimeUnit.SECONDS).build();
        Request request =
            new Request.Builder()
                .url(url)
                .addHeader("User-Agent", USER_AGENT)
                .addHeader("Origin", ORIGIN)
                .build();

        ByteArrayOutputStream audio = new ByteArrayOutputStream();
        final Exception[] error = new Exception[1];
        final boolean[] done = new boolean[1];

        WebSocketListener listener =
            new WebSocketListener() {
                @Override
                public void onOpen(WebSocket webSocket, Response response) {
                    webSocket.send(buildConfigMessage());
                    webSocket.send(buildSsmlMessage(requestId, text, voice));
                }

                @Override
                public void onMessage(WebSocket webSocket, ByteString bytes) {
                    byte[] data = bytes.toByteArray();
                    byte[] marker = "Path:audio\r\n".getBytes(StandardCharsets.UTF_8);
                    int idx = indexOf(data, marker);
                    if (idx >= 0) {
                        audio.write(data, idx + marker.length, data.length - idx - marker.length);
                    }
                    if (new String(data, StandardCharsets.UTF_8).contains("Path:turn.end")) {
                        webSocket.close(1000, "done");
                    }
                }

                @Override
                public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                    error[0] = new Exception(t.getMessage());
                    synchronized (done) {
                        done[0] = true;
                        done.notifyAll();
                    }
                }

                @Override
                public void onClosed(WebSocket webSocket, int code, String reason) {
                    synchronized (done) {
                        done[0] = true;
                        done.notifyAll();
                    }
                }
            };

        WebSocket ws = client.newWebSocket(request, listener);

        synchronized (done) {
            if (!done[0]) done.wait(30000);
        }

        if (error[0] != null) throw error[0];
        if (audio.size() == 0) throw new Exception("No audio returned");
        return audio.toByteArray();
    }

    private static int indexOf(byte[] data, byte[] marker) {
        outer:
        for (int i = 0; i <= data.length - marker.length; i++) {
            for (int j = 0; j < marker.length; j++) {
                if (data[i + j] != marker[j]) continue outer;
            }
            return i;
        }
        return -1;
    }

    private static String buildConfigMessage() {
        return "X-Timestamp:"
            + java.time.Instant.now().toString()
            + "Z\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n"
            + "{\"context\":{\"synthesis\":{\"audio\":{\"metadataoptions\":{\"sentenceBoundaryEnabled\":false,\"wordBoundaryEnabled\":false},\"outputFormat\":\"audio-24khz-48kbitrate-mono-mp3\"}}}}";
    }

    private static String buildSsmlMessage(String requestId, String text, String voice) {
        String locale = voice.replaceAll("^([a-z]{2}-[A-Z]{2}).*", "$1");
        if (!locale.matches("[a-z]{2}-[A-Z]{2}")) locale = "en-US";
        String escaped =
            text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
        String ssml =
            "<speak version='1.0' xml:lang='"
                + locale
                + "'><voice name='"
                + voice
                + "'><prosody rate='0%'>"
                + escaped
                + "</prosody></voice></speak>";
        return "X-RequestId:"
            + requestId
            + "\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:"
            + java.time.Instant.now().toString()
            + "Z\r\nPath:ssml\r\n\r\n"
            + ssml;
    }

    private static String generateSecMsGec() throws Exception {
        long ticks = System.currentTimeMillis() / 1000 + 11644473600L;
        ticks -= ticks % 300;
        ticks *= 10000000L;
        String input = ticks + TRUSTED;
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
}
