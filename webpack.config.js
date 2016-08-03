module.exports = {
  context: __dirname,
  entry: './lib/reducer',
  output: {
    path: __dirname + "/dist",
    filename: "bundle.js",
    target: "node",
    library: "resultsprocess",
    libraryTarget: 'umd',
    umdNamedDefine: true,
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loaders: ['transform/cacheable?brfs'],
        include: __dirname + '/node_modules/timezone-js'
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015', 'stage-2']
        }
      },
      {
        test: /\.json$/,
        exclude: /node_modules/,
        loader: 'json-loader',
        exclude: __dirname + '/node_modules'
      },
    ],
  },
  watch: true,
  cache: true,
  devtool: 'source-map',
};