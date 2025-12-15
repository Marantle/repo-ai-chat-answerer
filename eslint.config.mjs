import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Enforce strict complexity for business logic and API routes
      'complexity': ['error', { max: 5 }],
      // Enforce maximum nesting depth
      'max-depth': ['error', 3],
      // Enforce maximum lines per function
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      // Enforce maximum statements per function
      'max-statements': ['error', 15],
      // Enforce maximum function parameters
      'max-params': ['error', 4],
      // TypeScript-specific rules to prevent inline types and duplication
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],
    },
  },
  {
    // Relax complexity rules ONLY for React UI components (declarative JSX branching)
    // NOT for API routes - those are business logic
    files: ['**/components/**/*.tsx', '**/app/**/page.tsx', '**/app/**/layout.tsx'],
    rules: {
      'complexity': ['error', { max: 15 }],
      'max-lines-per-function': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-statements': ['error', 30],
    },
  },
  {
    // Relax rules for custom hooks (stateful logic, inherently more complex)
    files: ['**/hooks/**/*.ts', '**/hooks/**/*.tsx'],
    rules: {
      'complexity': ['error', { max: 10 }],
      'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-statements': ['error', 30],
      'max-depth': ['error', 4],
    },
  },
  {
    // Relax rules for scripts and tests
    files: ['**/scripts/**/*.ts', '**/test*.ts', '**/*.test.ts', '**/*.spec.ts', '**/*cli.ts'],
    rules: {
      'complexity': 'off',
      'max-statements': 'off',
      'max-lines-per-function': 'off',
    },
  },
  {
    // Disable Next.js-specific rules for non-Next.js packages
    files: ['packages/core/**/*.ts', 'packages/db/**/*.ts'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
    settings: {
      react: {
        version: '999.999.999', // Disable React version detection warning for non-React packages
      },
    },
  },
  // Override default ignores of eslint-config-next
  globalIgnores([
    // Default ignores of eslint-config-next
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Additional monorepo ignores
    'node_modules/**',
    'dist/**',
    '.turbo/**',
    'coverage/**',
    // Generated files
    '**/generated/**',
    '**/.next/**',
    '**/node_modules/**',
  ]),
]);

export default eslintConfig;
