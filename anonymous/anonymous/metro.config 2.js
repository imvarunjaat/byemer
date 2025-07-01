// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// 2. Enable NativeWind
module.exports = withNativeWind(config, {
  // 3. Set `input` to your CSS file's path.
  input: './global.css', // Assuming you have or will have a global.css for NativeWind
  // Ensure watchFolders is an array. If it's undefined, initialize it.
  watchFolders: [...(config.watchFolders || [])],
});
