module.exports = {
  root: true,
  extends: [
    'standard',
    'plugin:import/recommended'
  ],
  plugins: [
    'node',
    'promise'
  ],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    'max-lines': ['warn', 300],
    'max-lines-per-function': ['warn', 30],
    complexity: ['warn', 5],
    'max-params': ['warn', 3]
  }
}
