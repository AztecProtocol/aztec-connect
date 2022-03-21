"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
/**
 * Minify HTML in a safe way without breaking anything.
 */

var _default = {
  sortAttributes: false,
  collapseAttributeWhitespace: true,
  collapseBooleanAttributes: {
    amphtml: false
  },
  collapseWhitespace: 'conservative',
  custom: [],
  deduplicateAttributeValues: true,
  mergeScripts: true,
  mergeStyles: true,
  removeUnusedCss: false,
  minifyCss: {
    preset: 'default'
  },
  minifyJs: {},
  minifyJson: {},
  minifySvg: {
    plugins: [{
      collapseGroups: false
    }, {
      convertShapeToPath: false
    }]
  },
  minifyConditionalComments: false,
  removeEmptyAttributes: true,
  removeRedundantAttributes: false,
  removeComments: 'safe',
  removeAttributeQuotes: false,
  sortAttributesWithLists: 'alphabetical',
  minifyUrls: false,
  removeOptionalTags: false
};
exports.default = _default;