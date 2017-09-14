import path from 'path';
import nodeExternals from 'webpack-node-externals';

import ExtractTextPlugin from 'extract-text-webpack-plugin';

const client = {
  entry: {
    js: './src/app-client.js',
  },
  output: {
    path: path.join(__dirname, 'src', 'static', 'js'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader: 'babel-loader',
          options: 'cacheDirectory=.babel_cache',
        },
        include: path.join(__dirname, 'src')
      },
      { test: /\.css$/, loader: "style-loader!css-loader" }
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".css"]
  }
};

const server = {
  target: 'node',
  node: {
    __dirname: false,
  },
  externals: [nodeExternals({
    modulesFromFile: true,
  })],
  entry: {
    js: './src/server.js',
  },
  output: {
    path: path.join(__dirname, 'src'),
    filename: 'server-es5.js',
    libraryTarget: 'commonjs2',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader: 'babel-loader',
          options: 'cacheDirectory=.babel_cache',
        },
        include: path.join(__dirname, 'src')
      },
      { test: /\.css$/, loader: "style-loader!css-loader" }
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".css"]
  }
};

export default [client, server];