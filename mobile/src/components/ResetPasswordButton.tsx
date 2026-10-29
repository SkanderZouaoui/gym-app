import { useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Banner, BottomSheet } from './ui';
import { Button } from './Button';
import { ApiError } from '../api/client';

interface Props {
  /** Nom de la personne concernée, affiché dans les fenêtres. */
  name: string;
  email?: string | null;
  /** Appelle l'API et renvoie le mot de passe provisoire généré. */
  reset: () => Promise<{ password: string }>;
  label?: string;
}

/** Réinitialisation du mot de passe : confirmation, puis affichage unique du mot de passe provisoire (copier / partager). */
export function ResetPasswordButton({ name, email, reset, label = 'Réinitialiser le mot de passe' }: Props) {
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
          ? 'Utilisez « Mot de passe » dans votre profil pour changer le vôtre.'
          : e instanceof ApiError && e.code === 'RESET_NOT_ALLOWED'
            ? 'Seul un administrateur peut réinitialiser ce compte.'
            : 'La réinitialisation a échoué. Réessayez.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {error ? <Banner tone="danger" icon="error" text={error} /> : null}
      <Button label={label} variant="outline" onPress={() => { setError(null); setConfirm(true); }} />

      <BottomSheet visible={confirm} onClose={() => setConfirm(false)}>
        <Text style={styles.title}>Réinitialiser le mot de passe de {name} ?</Text>
        <Text style={styles.text}>
          Un nouveau mot de passe provisoire aléatoire sera généré. L’ancien ne fonctionnera plus, la personne sera déconnectée
          de ses appareils et devra choisir un mot de passe personnel à sa prochaine connexion.
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label="Oui, réinitialiser" variant="danger" loading={busy} onPress={run} />
          <Button label="Annuler" variant="outline" onPress={() => setConfirm(false)} />
        </View>
      </BottomSheet>

      <BottomSheet visible={!!result} onClose={() => setResult(null)}>
        <Text style={styles.title}>Nouveau mot de passe · {name}</Text>
        <Text style={styles.text}>Communiquez-le à la personne. Il ne sera plus affiché.</Text>
        <View style={styles.box}>
          <Text style={styles.label}>Mot de passe provisoire</Text>
          <Text style={styles.password} selectable>{result}</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Button
            label={copied ? 'Copié' : 'Copier le mot de passe'}
            variant="outline"
            onPress={async () => {
              if (!result) return;
              await Clipboard.setStringAsync(result);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          />
          <Button
            label="Partager"
            onPress={() => result && Share.share({ message: `Mot de passe provisoire MuscleUP${email ? `\nE-mail : ${email}` : ''}\nMot de passe : ${result}\n\nVous devrez le changer à votre première connexion.` })}
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
