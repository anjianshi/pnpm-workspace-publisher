module.exports = {
  extends: [require.resolve('@anjianshi/presets-eslint-node')],
  rules: {
    'no-await-in-loop': 'off',
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-loop-func': 'off',
    '@typescript-eslint/no-loop-func': 'off',
  },
}
