// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  { ignores: ['node_modules/**', 'data/**', 'docs/**', 'design/**', 'prototypes/**'] },
);
