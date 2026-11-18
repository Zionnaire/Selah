const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The one thing shared with the web app and the API: the domain package, read straight from its source.
// Mobile is not part of the pnpm workspace, so Metro has to be told to watch that folder.
config.watchFolders = [path.resolve(__dirname, '..', 'packages', 'domain', 'src')];

// Resolve every package from this project only. The shared code imports zod, and a second copy found in
// some parent folder (or a second React) would break the app, so lookup never leaves Mobile/node_modules.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;

// The bundled Bible text is a data file, not code: see scripts/assets.mjs.
config.resolver.assetExts = [...config.resolver.assetExts, 'bible'];

module.exports = config;
