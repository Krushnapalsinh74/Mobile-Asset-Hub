module.exports = ({ config }) => {
  try {
    // Check if node_modules are installed
    require.resolve('expo-router/package.json', { paths: [__dirname] });
  } catch (e) {
    console.log("⚠️ EAS Build Phase: Skipping plugins because node_modules are not installed yet.");
    // Strip plugins to avoid resolution errors before pnpm install
    config.plugins = [];
  }
  return config;
};
