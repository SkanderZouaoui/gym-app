/**
 * Remplace `react-native-mmkv` (module natif, absent d'Expo Go) par un stockage en mémoire.
 * Utilisé uniquement quand Metro est lancé avec EXPO_GO=1 (voir metro.config.js) : les builds natifs gardent le vrai MMKV.
 * Les données ne survivent pas à un redémarrage de l'app, ce qui suffit pour itérer sur l'UI.
 */
function createMMKV() {
  const data = new Map();
  const listeners = new Set();
  const emit = (key) => listeners.forEach((l) => l(key));
  return {
    getString: (key) => (data.has(key) ? data.get(key) : undefined),
    getNumber: (key) => (data.has(key) ? data.get(key) : undefined),
    getBoolean: (key) => (data.has(key) ? data.get(key) : undefined),
    set: (key, value) => {
      data.set(key, value);
      emit(key);
    },
    contains: (key) => data.has(key),
    remove: (key) => {
      const had = data.delete(key);
      if (had) emit(key);
      return had;
    },
    delete: (key) => {
      const had = data.delete(key);
      if (had) emit(key);
      return had;
    },
    getAllKeys: () => [...data.keys()],
    clearAll: () => {
      data.clear();
      emit(undefined);
    },
    addOnValueChangedListener: (listener) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
}

module.exports = { createMMKV };
