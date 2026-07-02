package com.espeak.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.media.MediaRecorder;
import android.os.Build;
import android.util.Base64;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileInputStream;

@CapacitorPlugin(
    name = "VoiceRecorder",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
    }
)
public class VoiceRecorderPlugin extends Plugin {

    private MediaRecorder mediaRecorder;
    private File outputFile;

    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean granted =
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("microphone", call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        boolean granted = getPermissionState("microphone") == PermissionState.GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        if (granted) {
            call.resolve(ret);
        } else {
            call.reject("Microphone permission denied");
        }
    }

    @PluginMethod
    public void startRecording(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission not granted");
            return;
        }
        try {
            outputFile = File.createTempFile("espeak_rec_", ".m4a", getContext().getCacheDir());
            mediaRecorder = new MediaRecorder();
            mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            mediaRecorder.setAudioSamplingRate(16000);
            mediaRecorder.setAudioEncodingBitRate(128000);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                mediaRecorder.setAudioChannels(1);
            }
            mediaRecorder.setOutputFile(outputFile.getAbsolutePath());
            mediaRecorder.prepare();
            mediaRecorder.start();
            call.resolve();
        } catch (Exception e) {
            cleanupRecorder();
            call.reject("Failed to start recording: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopRecording(PluginCall call) {
        try {
            if (mediaRecorder != null) {
                try {
                    mediaRecorder.stop();
                } catch (RuntimeException ignored) {
                    // recording too short
                }
                mediaRecorder.release();
                mediaRecorder = null;
            }

            if (outputFile == null || !outputFile.exists()) {
                call.reject("No recording file");
                return;
            }

            FileInputStream fis = new FileInputStream(outputFile);
            byte[] bytes = new byte[(int) outputFile.length()];
            int read = fis.read(bytes);
            fis.close();
            outputFile.delete();

            if (read <= 0) {
                call.reject("Recording is empty");
                return;
            }
            if (read < 1024) {
                call.reject("Recording too short");
                return;
            }

            String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
            JSObject ret = new JSObject();
            ret.put("base64", base64);
            ret.put("mimeType", "audio/mp4");
            call.resolve(ret);
        } catch (Exception e) {
            cleanupRecorder();
            call.reject("Failed to stop recording: " + e.getMessage());
        }
    }

    private void cleanupRecorder() {
        if (mediaRecorder != null) {
            try {
                mediaRecorder.release();
            } catch (Exception ignored) {}
            mediaRecorder = null;
        }
        if (outputFile != null && outputFile.exists()) {
            outputFile.delete();
        }
    }
}
