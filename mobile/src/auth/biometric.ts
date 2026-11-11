import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import i18n from '../i18n';
import { deleteItem, getItem, setItem } from '../api/storage';

const KEY = 'muscleup.biometricLogin';

interface Stored {
  email: string;
  password: string;
}

/** Le téléphone a un capteur (ou un visage) et au moins une empreinte / un visage enregistré. */
export async function biometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** « Face ID », « Touch ID » ou un nom générique sur Android (le système choisit visage ou empreinte). */
export async function biometricName(): Promise<string> {
  try {
    if (Platform.OS === 'ios') {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
      return 'Touch ID';
    }
  } catch {
    // nom générique ci-dessous
  }
  return i18n.t('biometric.generic_name');
}

/** Demande la biométrie ; `true` si l'utilisateur s'est authentifié. */
export async function confirmBiometric(promptMessage: string): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: i18n.t('common.annuler'), disableDeviceFallback: false });
    return res.success;
  } catch {
    return false;
  }
}

/** Active la connexion biométrique : les identifiants sont gardés dans le stockage sécurisé du système (Keychain / Keystore). */
export async function enableBiometricLogin(email: string, password: string): Promise<void> {
  await setItem(KEY, JSON.stringify({ email, password } satisfies Stored));
}

export async function disableBiometricLogin(): Promise<void> {
  await deleteItem(KEY);
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  return (await getItem(KEY)) !== null;
}

/** Identifiants gardés, après validation biométrique ; null si désactivé ou refusé. */
export async function unlockBiometricCredentials(promptMessage: string): Promise<Stored | null> {
  const raw = await getItem(KEY);
  if (!raw) return null;
  if (!(await confirmBiometric(promptMessage))) return null;
  try {
    return JSON.parse(raw) as Stored;
  } catch {
    await disableBiometricLogin();
    return null;
  }
}
