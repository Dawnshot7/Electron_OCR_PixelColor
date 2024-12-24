const { VueLoaderPlugin } = require('vue-loader');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const isDev = process.env.NODE_ENV === 'development'; // Check if running in development or production

// Custom plugin for JavaScript Obfuscator
class JavaScriptObfuscatorWebpackPlugin {
  constructor(options = {}) {
    this.options = options;
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('JavaScriptObfuscatorWebpackPlugin', (compilation, callback) => {
      const assets = compilation.assets;
      
      // Get the list of all JS assets and obfuscate them
      Object.keys(assets).forEach((filename) => {
        if (filename.endsWith('.js')) {
          const originalSource = assets[filename].source();
          const obfuscatedSource = JavaScriptObfuscator.obfuscate(originalSource, this.options).getObfuscatedCode();
          
          // Replace the original JS file with the obfuscated version
          assets[filename] = {
            source: () => obfuscatedSource,
            size: () => obfuscatedSource.length
          };
        }
      });
      callback();
    });
  }
}

module.exports = {
  entry: './src/renderer/renderer.js',
  mode: isDev ? 'development' : 'production',
  output: {
    path: path.resolve(__dirname, 'src/renderer'),
    filename: 'renderer.bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          transformAssetUrls: {
            img: 'src', // Ensures `img` tags resolve `src` paths
            image: 'xlink:href', // For SVG images
            // Add more here if using custom tags that have `src` attributes
          }
        }  
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['vue-style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource', // Handles the image files
        generator: {
          filename: 'assets/images/[name][ext][query]' // Customize your output directory
        }
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    // Add JavaScript Obfuscator for production builds only
    ...(isDev ? [] : [
      new JavaScriptObfuscatorWebpackPlugin({
        rotateStringArray: true,
        stringArray: true,
        stringArrayThreshold: 0.75
      }, ['renderer.bundle.js'])
    ]),
  ],
  resolve: {
    alias: {
      vue$: 'vue/dist/vue.esm-bundler.js',
      '@': path.resolve(__dirname, 'src') // This allows use of '@/assets/...'
    },
    extensions: ['*', '.js', '.vue', '.json']
  }
};
