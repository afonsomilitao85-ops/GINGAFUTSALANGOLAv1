import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    plugins: {
      'firebase-rules': firebaseRulesPlugin,
    },
    rules: {
      ...firebaseRulesPlugin.configs['flat/recommended'].rules,
    },
    files: ['**/*.rules'],
  },
];
