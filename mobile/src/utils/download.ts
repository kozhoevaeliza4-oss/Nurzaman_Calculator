// expo-file-system's SDK 57 default export switched to the new File/Directory
// API; the classic downloadAsync()/cacheDirectory we use here still lives
// under the /legacy subpath.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL, getToken } from '../api';

// Downloads a protected file (auth header required, so a plain <a href> or
// WebView navigation to the API URL can't work) to local cache storage and
// returns the local file:// uri — used to preview it in-app without
// triggering a save/share action.
export async function downloadToCache(path: string, fallbackName: string): Promise<string> {
  const token = await getToken();
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  const dest = `${dir}${fallbackName}`;

  const result = await FileSystem.downloadAsync(`${API_BASE_URL}${path}`, dest, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status === 401) {
    throw new Error('unauthorized');
  }
  if (result.status >= 400) {
    throw new Error(`Ошибка ${result.status}`);
  }

  return result.uri;
}

// Downloads a protected file (document, CSV export) to local storage, then
// opens the OS share/"open in" sheet — the mobile equivalent of a browser
// download, since RN has no direct "save to Downloads" primitive.
export async function downloadAndShare(path: string, fallbackName: string): Promise<void> {
  const uri = await downloadToCache(path, fallbackName);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
}
