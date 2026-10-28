// OFFLINE MODE DÉSACTIVÉ TEMPORAIREMENT (test en dev via Expo Go — MMKV est incompatible Expo Go).
// Pour réactiver : décommenter ci-dessous et supprimer le stub plus bas.
// import { createMMKV } from 'react-native-mmkv';
// import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
//
// /** Incrémenter quand la forme des données persistées change (invalide le cache disque existant). */
// export const QUERY_CACHE_VERSION = '1';
//
// const queryCacheStorage = createMMKV({ id: 'muscleup-query-cache' });
//
// export const queryPersister = createSyncStoragePersister({
//   storage: {
//     getItem: (key) => queryCacheStorage.getString(key) ?? null,
//     setItem: (key, value) => queryCacheStorage.set(key, value),
//     removeItem: (key) => queryCacheStorage.remove(key),
//   },
// });

export const QUERY_CACHE_VERSION = '1';

/** Stub no-op : pas de persistance disque en mode dev Expo Go (voir commentaire ci-dessus). */
export const queryPersister = {
  persistClient: async () => {},
  restoreClient: async () => undefined,
  removeClient: async () => {},
};
