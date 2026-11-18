module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-worklets/plugin requires a custom dev build and crashes in Expo Go
    plugins: [],
  };
};
