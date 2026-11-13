package com.atreyakamat.pixi;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // Registered before super so the bridge knows the plugin when the web layer first calls it.
        registerPlugin(SaveTargetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
