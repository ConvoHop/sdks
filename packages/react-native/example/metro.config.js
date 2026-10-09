const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// The example uses the SDK packages from this repository: they resolve through the repository's root node_modules,
// where npm links its workspaces. Native and React packages must have one copy, so they always resolve from here.
const root = path.resolve(__dirname, '../../..');
const singletons = [
  '@livekit/react-native',
  '@livekit/react-native-webrtc',
  '@react-native-async-storage/async-storage',
  '@react-native-community/netinfo',
  'livekit-client',
  'react',
  'react-native',
  'react-native-safe-area-context',
];
const isSingleton = name => singletons.some(singleton => name === singleton || name.startsWith(singleton + '/'));

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = {
  watchFolders: [
    path.join(root, 'node_modules'),
    ...['core', 'client', 'react', 'react-native'].map(name => path.join(root, 'packages', name)),
  ],
  resolver: {
    // React Native 0.79 and later resolve package exports by default.
    unstable_enablePackageExports: true,
    nodeModulesPaths: [path.join(__dirname, 'node_modules'), path.join(root, 'node_modules')],
    resolveRequest: (context, moduleName, platform) =>
      isSingleton(moduleName)
        ? context.resolveRequest({ ...context, originModulePath: path.join(__dirname, 'index.js') }, moduleName, platform)
        : context.resolveRequest(context, moduleName, platform),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
