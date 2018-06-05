const path = require('path');

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
          options: {
            cacheDirectory: '.babel_cache',
            presets: ['env']
          }
        },
        include: path.join(__dirname, 'src')
      },
      { test: /\.css$/, loader: "style-loader!css-loader" }
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".css"]
  },
  externals: {
    knex: 'commonjs knex'
  }
};

const server = {
  target: 'node',
  node: {
    __dirname: false,
  },
  devServer: {
    contentBase: path.join(__dirname, "src"),
    hot: true
  },
  entry: {
    js: './src/server.js',
  },
  output: {
    path: path.join(__dirname, 'src'),
    publicPath: '/src/',
    filename: 'server-es5.js',
    libraryTarget: 'commonjs2',
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
            presets: ['env']
          }
        },
        include: path.join(__dirname, 'src')
      },
      { test: /\.css$/, loader: "style-loader!css-loader" }
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".css"]
  },
  externals: {
    knex: 'commonjs knex'
  }
};

module.exports = [client, server];