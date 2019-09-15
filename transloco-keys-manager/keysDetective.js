#!/usr/bin/env node
const fs = require('fs');
const promptDirectory = require('inquirer-directory');
const inquirer = require('inquirer');
const { buildKeys, getScopesMap, readFile } = require('./keysBuilder');
const { getLogger } = require('./helpers');
const [localLang] = require('os-locale')
  .sync()
  .split('-');
const messages = require('./messages').getMessages(localLang);
const glob = require('glob');
const chalk = require('chalk');
const { regexs } = require('./regexs');
const { DeepDiff } = require('deep-diff');
const { applyChange } = require('deep-diff');
const Table = require('cli-table');

inquirer.registerPrompt('directory', promptDirectory);

const queries = basePath => [
  {
    type: 'directory',
    name: 'src',
    message: messages.src,
    basePath
  },
  {
    type: 'directory',
    name: 'i18n',
    message: messages.translationsLocation,
    basePath
  },
  {
    type: 'confirm',
    default: false,
    name: 'hasScope',
    message: messages.hasScope
  },
  {
    type: 'file-tree-selection',
    name: 'configPath',
    messages: messages.config
  },
  {
    type: 'confirm',
    default: true,
    name: 'addMissing',
    message: messages.addMissing
  },
  {
    type: 'input',
    name: 'defaultValue',
    default: '""',
    message: messages.defaultValue,
    when: ({ addMissing }) => addMissing
  }
];
const defaultConfig = {
  src: 'src',
  i18n: 'assets/i18n',
  addMissing: true,
  defaultValue: ''
};

let logger;
let _prodMode = false;

function verifyTranslationsDir(path) {
  const fullPath = `${process.cwd()}/${path}`;
  const dirExists = fs.existsSync(fullPath);
  const files = dirExists && glob.sync(`${fullPath}/**/*.json`);
  if (!dirExists || files.length === 0) {
    return console.log(
      chalk.bgRed.black(
        `Transloco Keys Manager: ${dirExists ? messages.noTranslationFilesFound(fullPath) : messages.pathDoesntExists}`
      )
    );
  }
  return files;
}

function compareKeysToFiles({ keys, i18nPath, addMissing, prodMode, translationFiles }) {
  _prodMode = _prodMode || prodMode;
  logger = getLogger(_prodMode);
  logger.startSpinner(`${messages.checkMissing} ✨`);
  const result = {};
  /** An array of the existing translation files in the i18n dir */
  const currentFiles = translationFiles || verifyTranslationsDir(i18nPath);
  if (!currentFiles) return;
  for (const fileName of currentFiles) {
    /** extract the lang name from the file */
    const { scope, fileLang } = regexs.fileLang(i18nPath).exec(fileName).groups;
    const extracted = scope ? keys[scope.slice(0, -1)] : keys.__global;
    if (!extracted) continue;
    /** Read the current file */
    const file = readFile(fileName);
    const fileObj = JSON.parse(file);
    const diffArr = DeepDiff(fileObj, extracted);
    if (diffArr) {
      const lang = `${scope || ''}${fileLang}`;
      result[lang] = {
        missing: [],
        extra: []
      };
      for (const diff of diffArr) {
        if (diff.kind === 'N') {
          result[lang].missing.push(diff);
          if (addMissing) {
            applyChange(fileObj, extracted, diff);
          }
        } else if (!_prodMode && diff.kind === 'D') {
          result[lang].extra.push(diff);
        }
      }
      if (addMissing) {
        const json = JSON.stringify(fileObj, null, 2);
        /** Write the corrected object to the original file */
        fs.writeFileSync(fileName, json, 'utf8');
      }
    }
  }
  if (_prodMode) {
    return;
  }

  logger.succeed(`${messages.checkMissing} ✨`);
  const resultFiles = Object.keys(result).filter(rf => {
    const { missing, extra } = result[rf];
    return missing.length || extra.length;
  });
  if (resultFiles.length > 0) {
    logger.log();
    logger.succeed(`🏁 \x1b[4m${messages.summary}\x1b[0m 🏁`);
    const table = new Table({
      head: ['File Name', 'Missing Keys', 'Extra Keys'].map(h => chalk.cyan(h)),
      colWidths: [40, 40, 30]
    });
    for (let i = 0; i < resultFiles.length; i++) {
      const row = [];
      const { missing, extra } = result[resultFiles[i]];
      const hasMissing = missing.length > 0;
      const hasExtra = extra.length > 0;
      if (!(hasExtra || hasMissing)) continue;
      row.push(`${resultFiles[i]}`);
      if (hasMissing) {
        row.push(missing.map(d => `'${d.path.join('.')}'`).join(', '));
      } else {
        row.push('--');
      }
      if (hasExtra > 0) {
        row.push(extra.map(d => (d.path ? `'${d.path.join('.')}'` : Object.keys(d.lhs).map(v => `'${v}'`))).join(', '));
      } else {
        row.push('--');
      }
      table.push(row);
    }
    logger.log(table.toString());
    addMissing && logger.succeed(`Added all missing keys to files 📜\n`);
  } else {
    logger.log(`\n🎉 ${messages.noMissing} 🎉\n`);
  }
}

/** Merge cli input, argv and defaults */
function initProcessParams(input, config) {
  const src = input.src || config.src || defaultConfig.src;
  const scopes = getScopesMap(input.configPath || config.configPath);
  const i18nPath = input.i18n || config.i18n || defaultConfig.i18n;
  let addMissing = input.addMissing;
  if (addMissing === undefined) addMissing = config.addMissing;
  if (addMissing === undefined) addMissing = defaultConfig.addMissing;

  const defaultValue = input.defaultValue || config.defaultValue || defaultConfig.defaultValue;

  return { src, i18nPath, defaultValue, addMissing, scopes };
}

function findMissingKeys({ config, basePath }) {
  _prodMode = config.prodMode;
  logger = getLogger(_prodMode);
  return inquirer
    .prompt(config.interactive ? queries(basePath) : [])
    .then(input => {
      const { src, i18nPath, defaultValue, addMissing, scopes } = initProcessParams(input, config);
      const translationFiles = verifyTranslationsDir(i18nPath);
      if (!translationFiles) return;
      logger.log('\n 🕵 🔎', `\x1b[4m${messages.startSearch}\x1b[0m`, '🔍 🕵\n');
      logger.startSpinner(`${messages.extract} `);
      const options = { src, scopes, defaultValue, file: config.file };
      return buildKeys(options).then(({ keys }) => {
        logger.succeed(`${messages.extract} 🗝`);
        compareKeysToFiles({ keys, i18nPath: `${process.cwd()}/${i18nPath}`, addMissing, translationFiles });
      });
    })
    .catch(e => logger.log(e));
}

module.exports = { findMissingKeys, compareKeysToFiles };
