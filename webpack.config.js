const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const client = {
  entry: ['webpack/hot/dev-server', './src/app-client.js'],
  output: {
    path: path.join(__dirname, 'src', 'static', 'js'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  devServer: {
    contentBase: path.join(__dirname, 'src', 'static'),
    port: 42808,
    hot: true,
    host: '0.0.0.0',
    historyApiFallback: true,
    proxy: {
      "/api": "http://localhost:42809"
    },
    watchOptions: {
      ignored: /node_modules/
    }
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: '.babel_cache',
            plugins: ['react-hot-loader/babel'],
            presets: ['@babel/preset-env']
          }
        },
        include: path.join(__dirname, 'src')
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".css"]
  },
  externals: {
    knex: 'commonjs knex'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/static/index.html'
    })
  ]
};

const server = {
  target: 'node',
  node: false,
  entry: [
    'regenerator-runtime/runtime',
    './src/server.js'
  ],
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

module.exports = [client, server];
