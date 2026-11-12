package com.atreyakamat.pixi;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.provider.DocumentsContract;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

/**
 * Lets a person choose any folder on their phone and lets Pixi write into it.
 *
 * Capacitor's Filesystem plugin can only reach app-owned directories and the media library, so the
 * app could never honour "save my photos here". This wraps Android's own folder chooser
 * (OPEN_DOCUMENT_TREE) and the Storage Access Framework, which grants access to exactly the one
 * folder the person picked and nothing else — no broad storage permission is requested.
 *
 * The granted permission is persisted across reboots, so the choice is made once.
 */
@CapacitorPlugin(name = "SaveTarget")
public class SaveTargetPlugin extends Plugin {

    /** Opens the system folder chooser. Resolves with the tree uri and a readable folder name. */
    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "folderPicked");
    }

    @ActivityCallback
    private void folderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject out = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null
                || result.getData().getData() == null) {
            out.put("cancelled", true);
            call.resolve(out);
            return;
        }
        Uri tree = result.getData().getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(tree,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        } catch (SecurityException e) {
            // Some providers do not offer a persistable grant. The uri still works for this run.
        }
        out.put("cancelled", false);
        out.put("uri", tree.toString());
        out.put("label", readableName(tree));
        call.resolve(out);
    }

    /**
     * Writes one file into the chosen folder. `append` adds to a file this call already started, so a
     * large photo or video crosses the bridge in pieces instead of as one string.
     */
    @PluginMethod
    public void writeFile(PluginCall call) {
        String treeUri = call.getString("uri");
        String name = call.getString("name");
        String data = call.getString("data");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        boolean append = Boolean.TRUE.equals(call.getBoolean("append", false));
        if (treeUri == null || name == null || data == null) {
            call.reject("uri, name and data are required");
            return;
        }
        try {
            Uri tree = Uri.parse(treeUri);
            Uri docsRoot = DocumentsContract.buildDocumentUriUsingTree(tree,
                    DocumentsContract.getTreeDocumentId(tree));
            Uri file;
            if (append) {
                file = Uri.parse(call.getString("fileUri", ""));
            } else {
                file = DocumentsContract.createDocument(getContext().getContentResolver(), docsRoot,
                        mimeType, name);
            }
            if (file == null) {
                call.reject("Could not create a file in that folder");
                return;
            }
            // android.util.Base64, not java.util: the latter needs API 26 and minSdk here is 24.
            byte[] bytes = android.util.Base64.decode(data, android.util.Base64.DEFAULT);
            // "wa" appends; "w" truncates. A fresh document is written with "w" so a retry replaces it.
            try (OutputStream os = getContext().getContentResolver()
                    .openOutputStream(file, append ? "wa" : "w")) {
                if (os == null) {
                    call.reject("That folder is not writable");
                    return;
                }
                os.write(bytes);
                os.flush();
            }
            JSObject out = new JSObject();
            out.put("fileUri", file.toString());
            call.resolve(out);
        } catch (IllegalArgumentException e) {
            call.reject("The saved folder is no longer valid. Pick it again.", e);
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? "The write failed" : e.getMessage(), e);
        }
    }

    /** True while the folder the person picked is still reachable and writable. */
    @PluginMethod
    public void checkFolder(PluginCall call) {
        String treeUri = call.getString("uri");
        JSObject out = new JSObject();
        if (treeUri == null) {
            out.put("usable", false);
            call.resolve(out);
            return;
        }
        boolean held = false;
        for (android.content.UriPermission p : getContext().getContentResolver().getPersistedUriPermissions()) {
            if (p.getUri().toString().equals(treeUri) && p.isWritePermission()) {
                held = true;
                break;
            }
        }
        out.put("usable", held);
        call.resolve(out);
    }

    /** Free bytes on the volume holding the app's files, for a space check before a long export. */
    @PluginMethod
    public void freeSpace(PluginCall call) {
        JSObject out = new JSObject();
        try {
            java.io.File dir = getContext().getFilesDir();
            StatFs stat = new StatFs(dir.getAbsolutePath());
            out.put("bytes", stat.getAvailableBlocksLong() * stat.getBlockSizeLong());
        } catch (Exception e) {
            out.put("bytes", -1);
        }
        call.resolve(out);
    }

    /**
     * Turns a tree uri into something a person recognises. Document ids look like "primary:DCIM/Pixi",
     * so the part after the colon is the path they chose; "primary" alone means internal storage.
     */
    private String readableName(Uri tree) {
        try {
            String id = DocumentsContract.getTreeDocumentId(tree);
            int colon = id.indexOf(':');
            String path = colon >= 0 && colon + 1 < id.length() ? id.substring(colon + 1) : "";
            if (path.isEmpty()) return "Internal storage";
            return path;
        } catch (Exception e) {
            return "the folder you picked";
        }
    }
}
