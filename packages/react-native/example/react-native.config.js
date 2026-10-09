const path = require('node:path');

// Links @convohop/react-native from this repository instead of from node_modules.
module.exports = {
  dependencies: {
    '@convohop/react-native': { root: path.resolve(__dirname, '..') },
  },
};
