const TranslocoPlugin = require('./transloco-keys-manager/webpack-plugin');

module.exports = {
  plugins: [
    new TranslocoPlugin({
      extract: {
        src: 'src',
        output: 'src/assets/i18n',
        configPath: 'src/app/app.module.ts',
        defaultValue: '🌐'
      },
      find: {
        i18n: 'src/assets/i18n',
      }
    })
  ]
};
