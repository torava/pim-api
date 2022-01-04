const path = require('path');
const { merge } = require('webpack-merge');
const nodeExternals = require('webpack-node-externals');

const common = {
  target: 'node',
  node: false,
  entry: './src/server.ts',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  watchOptions: {
    ignored: ['src/static', 'node_modules']
  },
  cache: false,
  module: {
    rules: [
      {
        test: /\.js$/,
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
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: ['ts-loader']
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ],
  },
  resolve: {
    extensions: ['.js', '.ts'],
    modules: [path.resolve(__dirname, 'src'), 'node_modules']
  },
  externals: [{
    knex: 'commonjs knex',
    },
    nodeExternals()
  ]
};

module.exports = merge(common, {
  performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
  }
});
