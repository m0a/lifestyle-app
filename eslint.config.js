import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dev-dist/**',
      '**/coverage/**',
      'packages/backend/public/**',
      // Flat config no longer auto-ignores dot-directories the way .eslintrc did,
      // so Wrangler's bundle temp dir would otherwise be linted.
      '**/.wrangler/**',
      '**/.vite/**',
      'tests/**',
      '**/*.config.js',
      '**/*.config.cjs',
    ],
  },
  {
    // Flat config only traverses js/cjs/mjs unless the extensions are named
    // here, which is how .mjs under packages/frontend/scripts used to escape
    // linting entirely under the old .eslintrc setup.
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      react.configs.flat.recommended,
      reactHooks.configs.flat['recommended-latest'],
      prettier,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // eslint-plugin-react 7.37 does not support ESLint 10 (peer tops out at ^9.7):
    // its 'detect' path calls a context API ESLint 10 removed and throws
    // "contextOrFilename.getFilename is not a function". Pinning the version
    // skips that code path entirely.
    settings: { react: { version: '18.3' } },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',

      // eslint-plugin-react-hooks 7 ships the React Compiler rule set: 17 rules
      // where v4 had 2. Three of them fired on existing code; the severities are
      // pinned here so the preset cannot silently change them later.
      //
      // set-state-in-effect / refs は実際のアンチパターンだったので error のまま
      // にして、指摘された 10 箇所はこの移行で直した（ActivityDotGrid の死んだ
      // setLens と render 中の ref 読み、Settings / WeightChart / MealEditMode は
      // render 中に前回値と比較する形へ、SessionListModal は useInfiniteQuery へ、
      // StrengthInput の pendingImport は誰も渡していない死んだ prop だったので削除）。
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/refs': 'error',
      // こちらは react-hook-form の watch() が React Compiler でメモ化できない
      // という外部ライブラリ起因の通知で、こちら側に直せる余地がない。消すと
      // react-hook-form を増やしたときに気付けなくなるので warn で残す。
      'react-hooks/incompatible-library': 'warn',
    },
  }
);
