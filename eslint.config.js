import config from '@helpwave/eslint-config'

export default [
  {
  ignores: ['dist/**'],
},
  ...config.recommended,
  {
    files: ['**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)'],
  },
]