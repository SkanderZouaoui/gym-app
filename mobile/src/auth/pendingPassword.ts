/** Mot de passe saisi à la connexion, gardé en mémoire (jamais persisté) pour préremplir le changement obligatoire. */
let pending: string | null = null;
export const pendingPassword = {
  set: (value: string) => {
    pending = value;
  },
  take: () => {
    const v = pending;
    pending = null;
    return v;
  },
};
