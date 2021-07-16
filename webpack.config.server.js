const path = require('path');
const nodeExternals = require('webpack-node-externals');
const slsw = require('serverless-webpack');
console.log('slsw.lib.entries', slsw.lib.entries);
module.exports = {
  target: 'node',
  node: false,
  entry: slsw.lib.entries || './src/server.js',
  output: {
    path: path.join(__dirname, 'src'),
    filename: 'server-compiled.js'
  },
  watchOptions: {
    ignored: ['src/static', 'node_modules']
  },
  cache: false,
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: '.babel_cache',
            presets: [
              ['@babel/preset-env',
              {
                targets: {
                  node: 'current',
                },
                exclude: ['babel-plugin-transform-classes']
              }]
            ]
          }
        },
        include: path.join(__dirname, 'src')
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
    modules: [path.resolve(__dirname, 'src'), 'node_modules']
  },
  externals: [{
    knex: 'commonjs knex',
    },
    nodeExternals()
  ]
};
