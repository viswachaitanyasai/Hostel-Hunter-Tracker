package com.hostelfinder.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Hand-written plugin (see SystemCameraPlugin) — Capacitor only
        // auto-discovers plugin classes shipped as libraries, so this one has to
        // be registered before the bridge starts.
        registerPlugin(SystemCameraPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
