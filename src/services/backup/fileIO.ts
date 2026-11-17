import { Share } from 'react-native';

/** Native: share the backup JSON through the system share sheet (Files, AirDrop, mail…). */
export async function saveTextFile(name: string, text: string): Promise<void> {
  await Share.share({ title: name, message: text });
}

/** Import from a file is currently offered on the web/PWA build only. */
export const canPickFile = false;

export async function pickTextFile(): Promise<string | null> {
  return null;
}
