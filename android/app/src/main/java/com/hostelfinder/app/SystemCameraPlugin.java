package com.hostelfinder.app;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

/**
 * Opens the device's own camera app and returns the shot as a base64 data URL.
 *
 * Why a native plugin rather than an `<input type="file" capture>`:
 *
 *   - Android's file-chooser bridge only reports *that* capture was requested.
 *     `FileChooserParams.isCaptureEnabled()` is a boolean, it has no lens value,
 *     so the `capture="environment"` attribute never reaches the camera app and
 *     the app opens whichever camera it used last — often the front, and on
 *     Samsung phones frequently an ultra-wide if that was the last selected lens.
 *
 *   - Android's public SDK has no supported way to pick a lens for
 *     ACTION_IMAGE_CAPTURE either. However, there is a widely honoured de-facto
 *     extra set that camera apps (Samsung's, Google's, Open Camera, AOSP) read:
 *
 *         android.intent.extras.CAMERA_FACING  0 = rear, 1 = front
 *         android.intent.extras.LENS_FACING_BACK / LENS_FACING_FRONT  1 = that lens
 *         android.intent.extra.USE_FRONT_CAMERA  boolean
 *
 *     This is the same workaround cross-platform plugins use to stop OEM camera
 *     apps from restoring the last-used lens. It is a convention, not an API, so
 *     a camera app is free to ignore it.
 *
 * The caller also gets a full-resolution JPEG: EXTRA_OUTPUT points the camera at
 * a FileProvider URI in the app cache, so nothing is downscaled and the photo is
 * never re-encoded by us (EXIF orientation survives, unlike a canvas capture).
 *
 * The CAMERA runtime permission is required: since Android 11, invoking a camera
 * app that declares CAMERA throws SecurityException unless the caller holds it.
 */
@CapacitorPlugin(
    name = "SystemCamera",
    permissions = { @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }) }
)
public class SystemCameraPlugin extends Plugin {

    /** Where the camera app writes the full-size JPEG while the call is in flight. */
    private File pendingPhoto;

    @PluginMethod
    public void capture(PluginCall call) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermissionCallback");
            return;
        }
        openCamera(call);
    }

    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            openCamera(call);
        } else {
            call.reject("Camera permission was denied");
        }
    }

    private void openCamera(PluginCall call) {
        try {
            File dir = new File(getContext().getCacheDir(), "captures");
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("Could not prepare a place to save the photo");
                return;
            }

            File photo = new File(dir, "photo-" + System.currentTimeMillis() + ".jpg");
            // Covered by android/app/src/main/res/xml/file_paths.xml (cache-path).
            Uri output = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                photo
            );

            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, output);
            // Rear lens (see the class comment). CAMERA_FACING_BACK is 0.
            intent.putExtra("android.intent.extras.CAMERA_FACING", 0);
            intent.putExtra("android.intent.extras.LENS_FACING_BACK", 1);
            intent.putExtra("android.intent.extra.USE_FRONT_CAMERA", false);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

            pendingPhoto = photo;
            startActivityForResult(call, intent, "cameraResult");
        } catch (ActivityNotFoundException e) {
            call.reject("No camera app is available on this device");
        } catch (Exception e) {
            call.reject("Could not open the camera: " + e.getMessage(), e);
        }
    }

    @ActivityCallback
    private void cameraResult(PluginCall call, ActivityResult result) {
        File photo = pendingPhoto;
        pendingPhoto = null;

        if (photo == null) {
            call.reject("The camera closed without returning a photo");
            return;
        }

        // Backing out of the camera app is not an error — resolve so JS can stay quiet.
        if (result.getResultCode() != android.app.Activity.RESULT_OK) {
            photo.delete();
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }

        try {
            byte[] bytes = readAllBytes(photo);
            photo.delete();

            if (bytes.length == 0) {
                call.reject("The camera saved an empty photo");
                return;
            }

            JSObject ret = new JSObject();
            ret.put("dataUrl", "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP));
            call.resolve(ret);
        } catch (IOException e) {
            call.reject("Could not read the captured photo", e);
        }
    }

    private static byte[] readAllBytes(File file) throws IOException {
        byte[] data = new byte[(int) file.length()];
        int offset = 0;
        try (FileInputStream in = new FileInputStream(file)) {
            while (offset < data.length) {
                int read = in.read(data, offset, data.length - offset);
                if (read < 0) break;
                offset += read;
            }
        }
        if (offset == data.length) return data;
        // Shorter than expected (rare) — return just what was read.
        byte[] actual = new byte[offset];
        System.arraycopy(data, 0, actual, 0, offset);
        return actual;
    }
}
