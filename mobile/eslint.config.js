// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*"],
  },
  {
    // Règles « React Compiler » du plugin react-hooks récent : le compilateur n'est pas
    // activé dans cette app et les patterns signalés (Animated.Value dans useRef, Date.now()
    // au rendu, init de formulaire dans un effet) sont valides. En warning tant qu'on
    // n'active pas le compilateur ; à repasser en error le jour où on le fait.
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
]);
