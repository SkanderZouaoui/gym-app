import { useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Banner, BottomSheet } from './ui';
import { Button } from './Button';
import { ApiError } from '../api/client';
import { useTranslation } from 'react-i18next';

interface Props {
  /** Nom de la personne concernée, affiché dans les fenêtres. */
  name: string;
  email?: string | null;
  /** Appelle l'API et renvoie le mot de passe provisoire généré. */
  reset: () => Promise<{ password: string }>;
  label?: string;
}

/** Réinitialisation du mot de passe : confirmation, puis affichage unique du mot de passe provisoire (copier / partager). */
export function ResetPasswordButton({ name, email, reset, label }: Props) {
  const { t } = useTranslation();
  const buttonLabel = label ?? t('common.reinitialiser_le_mot_de_passe_2');
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await reset();
      setResult(r.password);
      setConfirm(false);
    } catch (e) {
      setConfirm(false);
      setError(
        e instanceof ApiError && e.code === 'CANNOT_RESET_SELF'
          ? t('common.utilisez_mot_de_passe_dans')
          : e instanceof ApiError && e.code === 'RESET_NOT_ALLOWED'
            ? t('common.seul_un_administrateur_peut_reinitialiser')
            : t('common.la_reinitialisation_a_echoue_reessayez'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {error ? <Banner tone="danger" icon="error" text={error} /> : null}
      <Button label={buttonLabel} variant="outline" onPress={() => { setError(null); setConfirm(true); }} />

      <BottomSheet visible={confirm} onClose={() => setConfirm(false)}>
        <Text style={styles.title}>{t('common.reinitialiser_le_mot_de_passe', { name })}</Text>
        <Text style={styles.text}>{t('common.un_nouveau_mot_de_passe')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={t('common.oui_reinitialiser')} variant="danger" loading={busy} onPress={run} />
          <Button label={t('common.annuler')} variant="outline" onPress={() => setConfirm(false)} />
        </View>
      </BottomSheet>

      <BottomSheet visible={!!result} onClose={() => setResult(null)}>
        <Text style={styles.title}>{t('common.nouveau_mot_de_passe_2', { name })}</Text>
        <Text style={styles.text}>{t('common.communiquez_le_a_la_personne')}</Text>
        <View style={styles.box}>
          <Text style={styles.label}>{t('common.mot_de_passe_provisoire')}</Text>
          <Text style={styles.password} selectable>{result}</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Button
            label={copied ? t('common.copie') : t('common.copier_le_mot_de_passe')}
            variant="outline"
            onPress={async () => {
              if (!result) return;
              await Clipboard.setStringAsync(result);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          />
          <Button
            label={t('common.partager')}
            onPress={() => result && Share.share({ message: t('common.mot_de_passe_provisoire_muscleup', { v0: email ? t('common.share_email_line', { email }) : '', result }) })}
          />
        </View>
      </BottomSheet>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    title: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    text: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
    box: { padding: 14, borderRadius: radii.md, backgroundColor: colors.surface2, gap: 2 },
    label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
    password: { fontFamily: fonts.head, fontSize: 26, letterSpacing: 2, color: colors.text },
  });
}
