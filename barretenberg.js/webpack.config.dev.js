/**
 * Currently our unit tests cannot build the worker code just-in-time.
 * Basically, ts-node would need to install it's own module loader, but as we use yarn pnp there is already a custom
 * loader in place. The pnp loader *must* be present to even load the ts-node module, at which point it's no longer
 * possible to add the ts-node loader. This will be resolved when loader chaining makes its way into node.
 * In the meantime, we build a development version of the node worker into the node directory. The code in the worker
 * is very rarely expected to change, so impact on testing should be minimal, but if you're changing the worker in some
 * way, you must remember to rebuild it between test runs.
 *
 * When using the library from another package, the code is available in the dest dir as it was built by the typescript
 * compiler, so for the node use case there's nothing further to do.
 *
 * If you're reading this message, and node 18 is out with loader chaining, be a good engineer and investigate if
 * ts-node and yarn pnp module loader can work together, then we can remove this.
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import ResolveTypeScriptPlugin from 'resolve-typescript-plugin';

export default {
  target: 'node',
  mode: 'development',
  entry: './src/wasm/node/node_worker.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'ts-loader', options: { transpileOnly: true, onlyCompileBundledFiles: true } }],
      },
    ],
  },
  output: {
    path: resolve(dirname(fileURLToPath(import.meta.url)), './src/wasm/node'),
    filename: 'node_worker.js',
    library: {
      type: 'module',
    },
    chunkFormat: 'module',
  },
  experiments: {
    outputModule: true,
    topLevelAwait: true,
  },
  resolve: {
    plugins: [new ResolveTypeScriptPlugin()],
  },
};
