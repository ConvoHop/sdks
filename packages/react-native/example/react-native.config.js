const path = require('node:path');

// Links @instantrelay/react-native from this repository instead of from node_modules.
module.exports = {
  dependencies: {
    '@instantrelay/react-native': { root: path.resolve(__dirname, '..') },
  },
};
