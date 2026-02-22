import stylistic from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import pluginVitest from '@vitest/eslint-plugin';
import pluginOxlint from 'eslint-plugin-oxlint';
import tsdoc from 'eslint-plugin-tsdoc';
import vue from 'eslint-plugin-vue';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';

const plugins = {
  '@stylistic': stylistic,
  '@typescript-eslint': tsPlugin,
  tsdoc,
  vue
};

const parseConfig = {
  files: ['**/*.vue', '**/*.ts'],
  languageOptions: {
    parser: vueParser,
    parserOptions: {
      ecmaFeatures: { jsx: false },
      ecmaVersion: 'latest',
      extraFileExtensions: ['.vue'],
      parser: tsParser,
      sourceType: 'module'
    },
    globals: { ...globals.browser }
  }
};

const ignored = Object.fromEntries([
  'vue/singleline-html-element-content-newline',
  'vue/html-closing-bracket-spacing',
  'vue/no-multiple-template-root',
  'vue/order-in-components',
  'vue/attributes-order'
].map(rule => [rule, 'off']));

const rules = {
  ...tsPlugin.configs.recommended.rules,
  ...ignored,
  // Core ESLint rules
  'camelcase': ['warn', {
    'allow': [
      'source_text_length', 'detected_language', 'num_cards',
      'error_code', 'user_id', 'deck_id', 'ease_factor', 'next_review', 'last_reviewed', 'parent_id', 'updated_at',
      'start_time', 'end_time', 'cards_studied', 'new_cards', 'review_cards'
    ]
  }],
  'no-restricted-imports': ['error', {
    patterns: [{
      group: ['.*', '..*'],
      message: 'Please use absolute imports with "@"'
    }]
  }],
  'no-console': 'warn',
  'no-debugger': 'warn',
  'no-self-assign': 'error',
  'no-self-compare': 'error',
  'no-unmodified-loop-condition': 'warn',
  'no-unreachable-loop': 'error',
  'prefer-const': 'error',
  'quotes': ['error', 'single', { avoidEscape: true }],
  'key-spacing': ['error', {
    beforeColon: false,
    afterColon: true
  }],

  // Stylistic / formatting
  '@stylistic/comma-dangle': ['error', 'never'],
  '@stylistic/eol-last': ['error', 'always'],
  '@stylistic/indent': ['error', 2],
  '@stylistic/member-delimiter-style': ['error'],
  '@stylistic/no-multi-spaces': 'error',
  '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
  '@stylistic/no-trailing-spaces': 'error',
  '@stylistic/object-curly-spacing': ['error', 'always'],
  '@stylistic/semi': 'error',
  '@stylistic/space-before-blocks': ['error', 'always'],
  '@stylistic/space-infix-ops': 'error',
  '@stylistic/type-annotation-spacing': ['error', {
    before: false,
    after: true,
    overrides: { arrow: { before: true, after: true } }
  }],

  // TypeScript rules
  '@typescript-eslint/no-unused-vars': ['warn', {
    args: 'all',
    argsIgnorePattern: '^_',
    caughtErrors: 'all',
    caughtErrorsIgnorePattern: '^_',
    destructuredArrayIgnorePattern: '^_',
    ignoreRestSiblings: true,
    varsIgnorePattern: '^_'
  }],

  // TSDoc rules
  'tsdoc/syntax': 'warn',

  // Vue rules
  'vue/block-tag-newline': ['error'],
  // 'vue/component-name-in-template-casing': ['error', 'kebab-case', {
  //   registeredComponentsOnly: false,
  //   ignores: []
  // }],
  'vue/html-quotes': ['error', 'double'],
  'vue/object-curly-spacing': ['error', 'always'],
  'vue/padding-line-between-blocks': ['error', 'always'],
  'vue/space-infix-ops': 'error'
};

export default defineConfig([
  ...vue.configs['flat/recommended'],
  { ignores: ['*.d.ts', '**/dist/**', '**/dist-ssr/**', '**/coverage/**', 'vite.config.ts'] },
  { ...parseConfig },
  { plugins, rules } as object,
  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*']
  },
  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json')
]);
