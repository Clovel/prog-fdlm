import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import promise from 'eslint-plugin-promise';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stylisticRules = {
  eqeqeq: 'error',
  semi: [ 'error', 'always' ],
  quotes: [ 'error', 'single', { avoidEscape: true, allowTemplateLiterals: true } ],
  'jsx-quotes': [ 'error', 'prefer-double' ],
  'prefer-template': 'error',
  'eol-last': [ 'error', 'always' ],
  'comma-dangle': [
    'error',
    {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'only-multiline',
    },
  ],
  'keyword-spacing': [
    'error',
    {
      before: true,
      after: true,
      overrides: {
        if: { after: false },
        switch: { after: false },
        for: { after: false },
        while: { after: false },
        catch: { after: false },
      },
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...nextCoreWebVitals,
  {
    files: [ '**/*.{ts,tsx}' ],
    extends: [ ...tseslint.configs.recommendedTypeChecked ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      promise,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...promise.configs.recommended.rules,
      ...stylisticRules,
      'promise/always-return': [ 'error', { ignoreLastCallback: true } ],
      'promise/catch-or-return': [ 'error', { allowFinally: true } ],
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', disallowTypeAnnotations: false },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowTypedFunctionExpressions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'warn',
        {
          allowNumber: true,
          allowBoolean: true,
          allowAny: false,
          allowNullish: true,
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react/jsx-no-useless-fragment': 'error',
      'react/self-closing-comp': [ 'error', { component: true, html: true } ],
      'react/jsx-key': [ 'warn', { checkKeyMustBeforeSpread: true } ],
    },
  },
  {
    files: [ '**/*.{js,mjs,cjs,jsx}' ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: stylisticRules,
  },
);
