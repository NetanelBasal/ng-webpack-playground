const TranslocoPlugin = require('./transloco-keys-manager/webpack-plugin');

module.exports = {
  plugins: [
    new TranslocoPlugin({
      extract: {
        src: 'src',
        output: 'assets/i18n',
        langs: 'en',
        configPath: 'src/app/app.module.ts'
      },
      find: {
        i18n: 'src/assets/i18n',
        configPath: 'src/app/app.module.ts'
      }
    })
  ]
};
