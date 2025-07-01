module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', {
      // Add the polyfill for import.meta support in Hermes
      unstable_transformImportMeta: true
    }]],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
        },
      ],
    ],
  };
};