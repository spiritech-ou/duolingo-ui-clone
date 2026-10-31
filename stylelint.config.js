export default {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: ['dist/**', 'storybook-static/**', 'node_modules/**'],
  rules: {
    'color-no-hex': true,
    'max-nesting-depth': [3, { ignoreAtRules: ['include', 'media'] }],
    'declaration-no-important': true,
    // Class names are camelCase (conventions scss/modules.md).
    'selector-class-pattern': ['^[a-z][a-zA-Z0-9]*$', { message: 'Use camelCase class names.' }],
    // Components use semantic custom properties, never palette variables or raw spacing/radius.
    'scss/dollar-variable-pattern': null,
    'declaration-property-value-disallowed-list': [
      {
        '/^(color|background|background-color|border|border-color|outline|outline-color|fill|stroke)$/': ['/^(rgb|rgba|hsl|hsla)\\(/', '/^\\$/', '/palette/'],
        '/^(padding|margin|gap|row-gap|column-gap|border-radius)/': ['/\\d+px/'],
      },
    ],
  },
  overrides: [
    {
      // The token foundation itself may use raw values.
      files: ['src/styles/_variables.scss', 'src/styles/_themes.scss'],
      rules: {
        'color-no-hex': null,
        'color-hex-length': null,
        'scss/dollar-variable-empty-line-before': null,
        'declaration-property-value-disallowed-list': null,
      },
    },
    {
      // The reset is allowed !important (prefers-reduced-motion).
      files: ['src/styles/main.scss'],
      rules: { 'declaration-no-important': null },
    },
  ],
};
