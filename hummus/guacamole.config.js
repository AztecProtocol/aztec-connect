const path = require('path');

module.exports = {
  output: {
    path: path.resolve(__dirname, './src/styles'),
  },
  theme: {
    defaultFontFamily: 'Arial, Helvetica, sans-serif',
    deviceBreakpointMap: {
      s: '600px',
    },
  },
};
