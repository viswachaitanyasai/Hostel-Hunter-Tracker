import { Capacitor, registerPlugin } from '@capacitor/core';

interface SystemCameraResult {
  /** The shot as a base64 data URL. Absent when the user back out of the camera app. */
  dataUrl?: string;
  cancelled?: boolean;
}

interface SystemCameraPlugin {
  capture(): Promise<SystemCameraResult>;
}

const SystemCamera = registerPlugin<SystemCameraPlugin>('SystemCamera');

/**
 * The device's own camera app, asked for the rear lens.
 *
 * The plugin only exists in the Android build (`SystemCameraPlugin.java`), which
 * is the only place a lens can be requested at all — see that class for why an
 * `<input type="file" capture>` cannot do it. On the web the caller falls back
 * to the capture input, which mobile browsers do honour.
 */
export function hasSystemCamera(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SystemCamera');
}

/** Opens the camera app. Resolves with the photo, or `null` if nothing was taken. */
export async function capturePhotoWithSystemCamera(): Promise<string | null> {
  const { dataUrl, cancelled } = await SystemCamera.capture();
  if (cancelled || !dataUrl) return null;
  return dataUrl;
}
