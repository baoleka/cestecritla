// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    // The app is typed by its own configuration (tsconfig.app.json: Bundler resolution, the
    // types of astro/client), which the project service cannot find on its own — the nearest
    // tsconfig.json above src/ is the root one, and that one only knows scripts/ and eval/.
    // The Worker keeps the project service: it has a tsconfig.json of its own next to it.
    // `.astro` components are checked by `astro check` (npm run typecheck), not here.
    files: ['src/**/*.ts'],
    ignores: ['src/worker/**'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './tsconfig.app.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // The deploy guard is plain JavaScript on purpose: wrangler runs it as a build step, under
    // whatever `node` it was started with, and it must need nothing. No tsconfig knows it, so
    // it is linted without type information.
    files: ['scripts/deploy-guard.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['scripts/deploy-guard.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  { ignores: ['node_modules/**', 'data/**', 'docs/**', 'design/**', 'prototypes/**'] },
);
