"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = minifySvg;

var _svgo = _interopRequireDefault(require("svgo"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** Minify SVG with SVGO */
function minifySvg(tree, options, svgoOptions = {}) {
  let promises = [];
  const svgo = new _svgo.default(svgoOptions);
  tree.match({
    tag: 'svg'
  }, node => {
    let svgStr = tree.render(node, {
      closingSingleTag: 'slash',
      quoteAllAttributes: true
    });
    let promise = svgo.optimize(svgStr).then(result => {
      node.tag = false;
      node.attrs = {};
      node.content = result.data;
    });
    promises.push(promise);
    return node;
  });
  return Promise.all(promises).then(() => tree);
}