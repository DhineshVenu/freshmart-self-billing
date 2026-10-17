const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    mode: isProduction ? "production" : "development",
    entry: "./src/main.tsx",
    output: {
      path: path.resolve(__dirname, "dist-webpack"),
      filename: isProduction ? "assets/[name].[contenthash:8].js" : "bundle.js",
      chunkFilename: isProduction ? "assets/[name].[contenthash:8].chunk.js" : "[name].chunk.js",
      assetModuleFilename: "assets/[name].[hash:8][ext]",
      clean: true,
      publicPath: "/",
    },
    devtool: isProduction ? "source-map" : "eval-cheap-module-source-map",
    resolve: {
      extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
    },
    module: {
      rules: [
        // 1. JavaScript/TypeScript & React JSX Loader
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                ["@babel/preset-env", { targets: "defaults" }],
                ["@babel/preset-react", { runtime: "automatic" }],
                "@babel/preset-typescript",
              ],
            },
          },
        },
        // 2. CSS Loader + MiniCssExtractPlugin (or style-loader in dev)
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
          ],
        },
        // 3. Asset Modules: Images (PNG, JPG, JPEG, GIF, SVG)
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: "asset",
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024, // 8KB inline threshold (url-loader behavior)
            },
          },
        },
        // 4. Asset Modules: Audio (e.g. barcode scan chime)
        {
          test: /\.(mp3|wav|ogg)$/i,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      // Generates index.html and injects generated bundle script tags
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "public/index.html"),
        title: "Fresh Mart Supermarket Self-Billing",
        minify: isProduction
          ? {
              removeComments: true,
              collapseWhitespace: true,
            }
          : false,
      }),
      // Defines compile-time global constants
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(isProduction ? "production" : "development"),
      }),
      // Extracts CSS into separate files in production
      ...(isProduction
        ? [
            new MiniCssExtractPlugin({
              filename: "assets/[name].[contenthash:8].css",
            }),
          ]
        : []),
    ],
    // SplitChunks: separates vendor dependencies from application code
    optimization: {
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      },
    },
    // Webpack DevServer configuration
    devServer: {
      static: {
        directory: path.join(__dirname, "public"),
      },
      port: 8080,
      historyApiFallback: true,
      hot: true,
      open: false,
      proxy: [
        {
          context: ["/api"],
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      ],
    },
  };
};
