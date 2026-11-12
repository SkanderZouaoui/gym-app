const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// EXPO_GO=1 : Expo Go n'embarque pas react-native-mmkv, on le remplace par un stockage en mémoire.
if (process.env.EXPO_GO === '1') {
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react-native-mmkv') {
      return { type: 'sourceFile', filePath: path.join(__dirname, 'tools', 'mmkv-expo-go-shim.js') };
    }
    return (upstream ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = config;
