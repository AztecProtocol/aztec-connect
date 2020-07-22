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
    colorMap: {
      'primary-lightest': '#f1f5fc',
      red: '#ff8272',
    },
  },
};
