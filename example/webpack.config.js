const path = require('path')

module.exports = {
  devtool: 'source-map',
  entry: './app/index',
  output: {
    path: path.resolve(__dirname, '/public'),
    filename: 'app.js',
    publicPath: '/builds',
  },
  devServer: {
    stats: {chunks: false},
    contentBase: 'public',
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel',
        exclude: /node_modules/,
      },
    ],
  },
}
