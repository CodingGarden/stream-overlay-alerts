module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  globals: {
    DOMPurify: true,
    tmi: true,
    config: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 11,
  },
  rules: {
    'no-prototype-builtins': 0,
    'no-bitwise': 0,
    eqeqeq: 0,
    'no-plusplus': 0,
    radix: 0,
    'no-nested-ternary': 0,
    camelcase: 0,
    'no-param-reassign': 0,
  },
};
