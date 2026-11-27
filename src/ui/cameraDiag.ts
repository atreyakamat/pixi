"use client";

/**
 * One-shot diagnostic: what does this phone's browser/WebView actually expose for its cameras?
 * Device labels and capabilities (zoom range, facingMode reporting) vary wildly by OEM, so lens
 * detection in useCamera.ts is a best guess. This lets someone capture the real data off their own
 * phone and send it back, instead of us guessing blind.
 */
export interface CameraDiagInfo {
  userAgent: string;
  devices: { label: string; groupId: string }[];
  activeTrack?: { settings: Record<string, unknown>; capabilities: Record<string, unknown> };
  note?: string;
}

export async function collectCameraInfo(): Promise<CameraDiagInfo> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { userAgent: navigator.userAgent, devices: [], note: "This browser doesn't support enumerateDevices." };
  }
  // Device labels are blank until a camera permission has been granted at least once, so make sure
  // one is live before enumerating.
  let probe: MediaStream | null = null;
  let note: string | undefined;
  try {
    probe = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
  } catch {
    note = "Could not open the back camera for this probe — labels below may be blank.";
  }
  try {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
    const track = probe?.getVideoTracks()[0];
    const settings = (track?.getSettings?.() ?? {}) as Record<string, unknown>;
    const capabilities = (track?.getCapabilities?.() ?? {}) as Record<string, unknown>;
    return {
      userAgent: navigator.userAgent,
      devices: devices.map((d) => ({ label: d.label || "(blank)", groupId: d.groupId ? d.groupId.slice(0, 10) + "…" : "" })),
      activeTrack: track ? { settings, capabilities } : undefined,
      note,
    };
  } finally {
    probe?.getTracks().forEach((t) => t.stop());
  }
}

export async function copyCameraInfo(): Promise<{ ok: boolean; text: string }> {
  const info = await collectCameraInfo();
  const text = JSON.stringify(info, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, text };
  } catch {
    return { ok: false, text };
  }
}
