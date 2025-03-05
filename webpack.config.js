const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: false, // 完全禁用source maps
  entry: {
    content: './src/content.js',
    background: './src/background.js',
    popup: './src/popup.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  chrome: '88',
                },
                modules: false, // 重要：保持ES模块
                useBuiltIns: false // 避免引入polyfills
              }]
            ]
          }
        }
      }
    ]
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
          compress: {
            drop_console: true,
          },
          mangle: true,
          // 关键设置: 防止生成可能包含eval的代码
          ecma: 2020,
          safari10: true // 更保守的转换
        },
        extractComments: false,
      }),
    ],
    // 关闭代码分割，避免动态导入
    splitChunks: {
      chunks: 'all'
    }
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: './src/manifest.json', to: 'manifest.json' },
        { from: './src/popup.html', to: 'popup.html' },
        { from: './src/assets', to: 'assets', noErrorOnMissing: true }
      ],
    }),
  ]
};