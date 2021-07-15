const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');

module.exports = {
  entry: './src/app-client.js',
  output: {
    path: path.join(__dirname, 'src', 'static', 'js'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  devServer: {
    contentBase: path.join(__dirname, 'src', 'static'),
    historyApiFallback: true,
    port: 42808,
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
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.jsx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: '.babel_cache',
            presets: ['@babel/preset-env']
          }
        },
        include: path.join(__dirname, 'src')
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          "style-loader",
          // Translates CSS into CommonJS
          "css-loader",
          // Compiles Sass to CSS
          "sass-loader"
        ],
      }
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".css"]
  },
  externals: {
    knex: 'commonjs knex'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/static/index.html'
    }),
    new DefinePlugin({
      'process.env.VERSION': JSON.stringify(
        process.env.npm_package_version,
      ),
    }),
  ]
};

