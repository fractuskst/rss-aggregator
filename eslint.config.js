import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    ...pluginJs.configs.recommended,
    rules: {
      quotes: ['error', 'single'],
      'comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'always-multiline',
        },
      ],
      'implicit-arrow-linebreak': ['error', 'beside'],
      'operator-linebreak': ['error', 'before'],
      'function-paren-newline': ['error', 'multiline'],
      indent: ['error', 2],
    },
  },
];
