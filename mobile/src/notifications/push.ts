import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiRequest } from '../api/client';
import { getItem, setItem, deleteItem } from '../api/storage';
import i18n from '../i18n';

const TOKEN_KEY = 'muscleup.pushToken';

/** Notification reçue application ouverte : bandeau + son, comme en arrière-plan. */
export function configureForegroundNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: i18n.t('push.channel'),
    // eslint-disable-next-line import/namespace -- exporté par expo-notifications, non résolu par le linter
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#7C3AED',
  });
}

/** Demande l'autorisation, récupère le jeton Expo de l'appareil et l'enregistre sur le compte connecté.
 * Sans effet sur simulateur, sur le web ou si l'utilisateur refuse. */
export async function registerForPush(): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;
    await ensureAndroidChannel();
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await apiRequest('/v1/me/device-tokens', { method: 'POST', body: { token, platform: Platform.OS } });
    await setItem(TOKEN_KEY, token);
  } catch {
    // push indisponible (pas de clés FCM, hors ligne…) : l'application reste utilisable, nouvel essai à la prochaine ouverture
  }
}

/** À la déconnexion : cet appareil ne doit plus recevoir les notifications du compte. */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await getItem(TOKEN_KEY);
    if (!token) return;
    await apiRequest('/v1/me/device-tokens', { method: 'DELETE', body: { token } });
    await deleteItem(TOKEN_KEY);
  } catch {
    // hors ligne : le serveur réassignera le jeton au prochain compte qui se connecte sur cet appareil
  }
}

export async function clearBadge() {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // non critique
  }
}
