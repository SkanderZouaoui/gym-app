import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Linking, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fonts } from '../../src/theme/tokens';
import { AuthButton, AuthErrorBanner, AuthField, AuthScreen, LogoTile, useAuthPalette } from '../../src/components/auth/AuthKit';
import type { SubmitStatus } from '../../src/components/SubmitButton';
import { authApi, meApi, publicApi } from '../../src/api/endpoints';
import { tokenStorage } from '../../src/api/storage';
import { useSessionStore } from '../../src/store/session';
import { ApiError } from '../../src/api/client';
import type { MembershipSummary } from '../../src/api/types';
import { pendingPassword } from '../../src/auth/pendingPassword';
import { rootRouteForRole } from '../../src/navigation/roleRoutes';
import i18n, { LANGUAGE_LABELS, dateLocale } from '../../src/i18n';
import { LanguageSheet } from '../../src/components/LanguageSheet';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { useNetworkStatusContext } from '../../src/hooks/NetworkStatusContext';

/** Durée pendant laquelle le bouton reste rouge après un échec, avant de revenir à son état normal. */
const ERROR_FLASH_MS = 2400;
/** Délai de repli quand le serveur bloque les essais sans préciser la durée. */
const DEFAULT_LOCK_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Longueur minimale du mot de passe (même règle que le serveur) : en dessous, le bouton reste inactif. */
const PASSWORD_MIN_LENGTH = 8;

type FailureKind = 'credentials' | 'format' | 'rate' | 'disabled' | 'server' | 'network' | 'unknown';
interface LoginFailure {
  kind: FailureKind;
  tone: 'danger' | 'warning';
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  /** Texte du bandeau ; `{{time}}` est remplacé par le compte à rebours pour un blocage temporaire. */
  messageKey: string;
  retryAfterSeconds?: number;
  /** Essais restants avant le blocage temporaire (renvoyé par le serveur avec « identifiants incorrects »). */
  attemptsRemaining?: number;
}

/** Connexion réussie mais abonnement expiré : on explique avant d'ouvrir l'application (maquette « 5 · Abonnement expiré »). */
interface ExpiredGate {
  endDate: Date;
  proceed: () => void;
}

/** Date de fin du dernier abonnement si l'adhérent en a eu et qu'aucun n'est encore valable ; sinon null. */
function expiredSince(memberships: MembershipSummary[]): Date | null {
  if (memberships.length === 0) return null;
  const now = Date.now();
  const stillValid = memberships.some((m) => m.status === 'ACTIVE' && new Date(m.endDate).getTime() > now);
  if (stillValid) return null;
  const expired = memberships
    .filter((m) => m.status === 'EXPIRED' || (m.status === 'ACTIVE' && new Date(m.endDate).getTime() <= now))
    .map((m) => new Date(m.endDate).getTime());
  return expired.length > 0 ? new Date(Math.max(...expired)) : null;
}

const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Écran de connexion — FitZone Login Refonte : états d'erreur (identifiants, champs invalides, trop de tentatives,
 * compte désactivé, pas de réseau) et bouton animé. */
export default function LoginScreen() {
  const { t } = useTranslation();
  const pal = useAuthPalette();
  const { language } = useLanguage();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const [credentialsInvalid, setCredentialsInvalid] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [expiredGate, setExpiredGate] = useState<ExpiredGate | null>(null);
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatusContext();
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // « Contacter l'accueil » : seulement quand c'est utile (blocage, compte désactivé) et si la salle a publié un contact.
  const needsContact = failure?.kind === 'rate' || failure?.kind === 'disabled';
  const { data: contact } = useQuery({
    queryKey: ['venue-contact'],
    queryFn: publicApi.getVenueContact,
    enabled: needsContact,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const contactUrl = contact?.phone ? `tel:${contact.phone.replace(/\s+/g, '')}` : contact?.email ? `mailto:${contact.email}` : null;

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  // Compte à rebours d'un blocage temporaire (trop de tentatives).
  useEffect(() => {
    if (lockUntil === null) return;
    const tick = () => {
      const left = Math.ceil((lockUntil - Date.now()) / 1000);
      if (left <= 0) {
        setLockUntil(null);
        setRemaining(0);
        setStatus('idle');
        setFailure((f) => (f?.kind === 'rate' ? null : f));
        return;
      }
      setRemaining(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockUntil]);

  // Réseau revenu après un échec « pas de connexion » : le message n'a plus lieu d'être.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current) setFailure((f) => (f?.kind === 'network' ? null : f));
    wasOnline.current = isOnline;
  }, [isOnline]);

  const switchAccount = () => {
    void tokenStorage.clear();
    queryClient.clear();
    setExpiredGate(null);
    setPassword('');
  };

  const editing = () => {
    if (expiredGate) switchAccount();
    setCredentialsInvalid(false);
    // Un blocage temporaire ne se lève pas en modifiant les champs ; les autres messages, si.
    setFailure((f) => (f?.kind === 'rate' ? f : null));
  };

  const handleLogin = async () => {
    const emailTrimmed = email.trim();
    // Le bouton est inactif tant que le format n'est pas valide ; ce garde-fou couvre la touche « Entrée » du clavier.
    if (status !== 'idle' || !EMAIL_RE.test(emailTrimmed) || password.length < PASSWORD_MIN_LENGTH) return;

    setFailure(null);
    setCredentialsInvalid(false);
    setStatus('loading');
    try {
      const tokens = await authApi.login(emailTrimmed, password);
      // Données en cache d'un autre compte (profil, réservations…) : on repart de zéro.
      queryClient.clear();
      await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
      const user = await meApi.getMe();
      const roles = user.roles.map((r) => r.role);
      const activeRole = roles[0] ?? 'MEMBER';
      const enterApp = async () => {
        // Le bouton passe en succès (cercle vert, saut, coche) un court instant avant d'ouvrir l'application.
        setStatus('success');
        await new Promise((resolve) => setTimeout(resolve, 1300));
        setSession(user, roles, activeRole);
        if (user.mustChangePassword) {
          pendingPassword.set(password);
          router.replace('/force-password');
          return;
        }
        router.replace(rootRouteForRole(activeRole) as any);
      };

      // Adhérent dont l'abonnement est expiré : on le dit avant d'entrer, avec un accès direct aux formules.
      if (activeRole === 'MEMBER' && !user.mustChangePassword) {
        const endDate = expiredSince(await meApi.getMemberships().catch(() => []));
        if (endDate) {
          setExpiredGate({
            endDate,
            proceed: () => {
              void (async () => {
                setStatus('success');
                await new Promise((resolve) => setTimeout(resolve, 900));
                setSession(user, roles, activeRole);
                router.replace(rootRouteForRole(activeRole) as any);
                setTimeout(() => router.push('/(member)/subscription' as any), 0);
              })();
            },
          });
          setStatus('idle');
          return;
        }
      }
      await enterApp();
    } catch (e) {
      const f = classifierEchec(e);
      setFailure(f);
      setAttempt((n) => n + 1);
      setCredentialsInvalid(f.kind === 'credentials');
      if (f.kind === 'rate') {
        setLockUntil(Date.now() + (f.retryAfterSeconds ?? DEFAULT_LOCK_SECONDS) * 1000);
        setStatus('locked');
      } else {
        // Le bouton devient rouge avec la cause en toutes lettres, puis revient à la normale.
        setStatus('error');
        flashTimer.current = setTimeout(() => setStatus('idle'), ERROR_FLASH_MS);
      }
    }
  };

  const time = formatCountdown(remaining);
  const accountDisabled = failure?.kind === 'disabled';
  const formValid = EMAIL_RE.test(email.trim()) && password.length >= PASSWORD_MIN_LENGTH;
  const retryMode = failure?.kind === 'network' && status === 'idle';

  return (
    <>
      <AuthScreen topRight={<LogoTile />}>
        <Text style={{ fontFamily: fonts.head, fontSize: 28, letterSpacing: -0.8, lineHeight: 30, color: pal.fg }}>{t('auth.bon_retour')}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: pal.mu, marginTop: 6 }}>{t('auth.login_subtitle')}</Text>

        <View style={{ gap: 12, marginTop: 16 }}>
          {expiredGate ? (
            <AuthErrorBanner
              tone="warning"
              icon="event-busy"
              title={t('auth.err_expired_title')}
              message={t('auth.err_expired_text', { date: expiredGate.endDate.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' }) })}
              attempt={attempt}
            />
          ) : failure ? (
            <AuthErrorBanner
              tone={failure.tone}
              icon={failure.icon}
              title={failure.title}
              message={
                t(failure.messageKey, { time }) +
                (failure.attemptsRemaining != null ? ` ${t(failure.attemptsRemaining === 1 ? 'auth.attempts_left_single' : 'auth.attempts_left_multiple', { count: failure.attemptsRemaining })}` : '')
              }
              attempt={attempt}
            />
          ) : null}
          <View style={{ gap: 6 }}>
            <AuthField
              icon="mail"
              value={email}
              onChangeText={(v) => { setEmail(v); editing(); }}
              keyboardType="email-address"
              placeholder={t('auth.id_placeholder')}
              autoComplete="email"
              error={credentialsInvalid}
              shakeKey={attempt}
            />
            <AuthField
              icon="lock"
              secure
              value={password}
              onChangeText={(v) => { setPassword(v); editing(); }}
              placeholder={t('common.mot_de_passe')}
              onSubmitEditing={handleLogin}
              error={credentialsInvalid}
              shakeKey={attempt}
            />
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', marginTop: 6, marginBottom: 6 }}>
          <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={6} style={{ paddingVertical: 10 }}>
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14, color: pal.accent }}>{t('auth.mot_de_passe_oublie_2')}</Text>
          </Pressable>
        </View>

        <AuthButton
          label={expiredGate ? t('auth.btn_see_plans') : retryMode ? t('auth.btn_retry') : t('auth.se_connecter')}
          loadingLabel={t('auth.connexion')}
          errorLabel={failure?.title}
          lockedLabel={t('auth.btn_locked', { time })}
          status={status}
          onPress={expiredGate ? expiredGate.proceed : handleLogin}
          disabled={accountDisabled || (!formValid && !expiredGate)}
          icon={retryMode ? 'refresh' : 'arrow-forward'}
        />
        {expiredGate ? (
          <Pressable onPress={switchAccount} hitSlop={6} style={{ alignSelf: 'center', paddingVertical: 8 }}>
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14, color: pal.accent }}>{t('auth.use_other_account')}</Text>
          </Pressable>
        ) : null}
        {contactUrl && needsContact ? (
          <Pressable onPress={() => void Linking.openURL(contactUrl)} hitSlop={6} style={{ alignSelf: 'center', paddingVertical: 8 }}>
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14, color: pal.accent }}>{t('auth.contact_reception')}</Text>
          </Pressable>
        ) : null}
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.mu, textAlign: 'center', marginTop: 10 }}>{t('auth.no_self_signup')}</Text>

        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingTop: 24 }}>
          <Pressable
            onPress={() => setLanguageOpen(true)}
            accessibilityLabel={t('common.langue')}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 18, borderRadius: 23, backgroundColor: pal.sf, borderWidth: 1.5, borderColor: pal.bd }, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="language" size={20} color={pal.accent} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: pal.fg }}>{LANGUAGE_LABELS[language]}</Text>
            <MaterialIcons name="expand-more" size={20} color={pal.mu} />
          </Pressable>
        </View>
      </AuthScreen>
      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </>
  );
}

/** Cause de l'échec de connexion → bandeau (ton, icône, titre, message) conforme à la maquette « Erreurs de connexion ». */
function classifierEchec(e: unknown): LoginFailure {
  const mk = (kind: FailureKind, tone: LoginFailure['tone'], icon: LoginFailure['icon'], key: string, retryAfterSeconds?: number): LoginFailure => ({
    kind, tone, icon, title: i18n.t(`auth.err_${key}_title`), messageKey: `auth.err_${key}_text`, retryAfterSeconds,
  });
  // `fetch` lève une TypeError quand le réseau est coupé ; toute autre exception inattendue n'est pas un problème de réseau.
  if (e instanceof TypeError) return mk('network', 'warning', 'wifi-off', 'network');
  if (!(e instanceof ApiError)) return mk('unknown', 'danger', 'error-outline', 'unknown');
  if (e.code === 'INVALID_CREDENTIALS') {
    const attemptsRemaining = (e.details as { attemptsRemaining?: number } | undefined)?.attemptsRemaining;
    return { ...mk('credentials', 'danger', 'error', 'credentials'), attemptsRemaining };
  }
  if (e.code === 'ACCOUNT_DISABLED') return mk('disabled', 'danger', 'block', 'disabled');
  if (e.code === 'BAD_REQUEST') return mk('format', 'danger', 'alternate-email', 'format');
  if (e.status === 429) {
    const seconds = (e.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds;
    return mk('rate', 'warning', 'lock-clock', 'rate', seconds);
  }
  if (e.status >= 500) return mk('server', 'danger', 'cloud-off', 'server');
  return mk('unknown', 'danger', 'error-outline', 'unknown');
}
