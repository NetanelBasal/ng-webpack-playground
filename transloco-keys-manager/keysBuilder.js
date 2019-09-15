#!/usr/bin/env node
const fs = require('fs');
const promptDirectory = require('inquirer-directory');
const inquirerFileTreeSelection = require('inquirer-file-tree-selection-prompt');
const inquirer = require('inquirer');
const find = require('find');
const glob = require('glob');
const [localLang] = require('os-locale')
  .sync()
  .split('-');
const messages = require('./messages').getMessages(localLang);
const { mergeDeep, buildObjFromPath, isObject, toCamelCase, countKeysRecursively, getLogger } = require('./helpers');
const { regexs } = require('./regexs');
let spinner;

/** ENUMS */
const TEMPLATE_TYPE = { STRUCTURAL: 0, NG_TEMPLATE: 1 };

inquirer.registerPrompt('directory', promptDirectory);
inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection);

const queries = basePath => [
  {
    type: 'directory',
    name: 'src',
    message: messages.src,
    basePath
  },
  {
    type: 'directory',
    name: 'output',
    message: messages.output,
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
    messages: messages.config,
    when: ({ hasScope }) => hasScope
  },
  {
    type: 'input',
    default: `en${localLang !== 'en' ? ', ' + localLang : ''}`,
    name: 'langs',
    message: messages.langs
  },
  {
    type: 'input',
    name: 'keepFlat',
    message: messages.keepFlat
  },
  {
    type: 'input',
    name: 'defaultValue',
    default: '""',
    message: messages.defaultValue
  }
];
const defaultConfig = {
  src: 'src',
  output: 'assets/i18n',
  langs: 'en',
  defaultValue: ''
};
let logger;

/** Get the keys from an ngTemplate based html code. */
function getTemplateBasedKeys(rgxResult, templateType) {
  let scopeKeys, read, readSearch, varName;
  const [matchedStr] = rgxResult;
  if (templateType === TEMPLATE_TYPE.STRUCTURAL) {
    varName = rgxResult.groups.varName;
    readSearch = matchedStr.match(/read:\s*(?:'|")(?<read>[a-zA-Z-0-9-_]*)(?:'|")/);
  } else {
    varName = matchedStr.match(/let-(?<varName>\w*)/).groups.varName;
    readSearch = matchedStr.match(/(?:\[?read\]?=\s*(?:'|"){1,2}(?<read>[a-zA-Z-0-9-_]*)(?:'|"){1,2})/);
  }
  scopeKeys = matchedStr.match(regexs.templateKey(varName));
  read = readSearch && readSearch.groups.read;
  return { scopeKeys, read, varName };
}

/** Read a utf-8 file synchronously  */
function readFile(file) {
  return fs.readFileSync(file, { encoding: 'UTF-8' });
}

/** Init the values needed for extraction */
function initExtraction(src) {
  return { srcPath: `${process.cwd()}/${src}`, keys: { __global: {} }, fileCount: 0 };
}
function performTSExtraction({ file, scopes, defaultValue, keepFlat, keys }) {
  const str = readFile(file);
  if (!str.includes('@ngneat/transloco')) return;
  const service = regexs.serviceInjection.exec(str);
  if (service) {
    /** service translationCalls regex */
    const rgx = regexs.translationCalls(service.groups.serviceName);
    keys = iterateRegex({ rgx, keys, str, keepFlat, scopes, defaultValue });
  }
  const directTranslate = regexs.directImport.exec(str);
  if (directTranslate) {
    const rgx = regexs.directTranslate;
    keys = iterateRegex({ rgx, keys, str, keepFlat, scopes, defaultValue });
  }
  return keys;
}

/**
 * Extract all the keys that exists in the ts files. (no dynamic)
 */
function extractTSKeys({ src, keepFlat = [], scopes, defaultValue, files }) {
  let { srcPath, keys, fileCount } = initExtraction(src);
  return new Promise(resolve => {
    if (files) {
      for (const file of files) {
        fileCount++;
        keys = performTSExtraction({ file, defaultValue, keepFlat, scopes, keys });
      }
      resolve({ keys, fileCount });
    } else {
      find
        .eachfile(/\.ts$/, srcPath, file => {
          /** Filter out spec files */
          if (file.endsWith('.spec.ts')) return;
          fileCount++;
          keys = performTSExtraction({ file, defaultValue, keepFlat, scopes, keys });
        })
        .end(() => {
          resolve({ keys, fileCount });
        });
    }
  });
}

/**
 * Insert a given key to the right place in the keys map.
 * 1. If this is a scoped key, enter to the correct scope.
 * 2. If this is a global key, enter to the reserved '__global' key in the map.
 */
function insertValueToKeys({ inner, keys, scopes, key, defaultValue }) {
  const value = inner.length ? buildObjFromPath(inner, defaultValue) : defaultValue;
  const scope = scopes.keysMap[key];
  if (scope) {
    if (!keys[scope]) {
      keys[scope] = {};
    }
    keys[scope] = keys[scope] && isObject(value) ? mergeDeep(keys[scope], value) : value;
  } else {
    keys.__global[key] = keys.__global[key] && isObject(value) ? mergeDeep(keys.__global[key], value) : value;
  }
}

function performTemplateExtraction({ file, scopes, defaultValue, keepFlat, keys }) {
  const str = readFile(file);
  if (!str.includes('transloco')) return;
  let result;
  /** structural directive and ng-template */
  [regexs.structural, regexs.template].forEach((rgx, index) => {
    result = rgx.exec(str);
    while (result) {
      const { scopeKeys, read, varName } = getTemplateBasedKeys(result, index);
      scopeKeys &&
        scopeKeys.forEach(rawKey => {
          /** The raw key may contain square braces we need to align it to '.' */
          let [key, ...inner] = rawKey
            .trim()
            .replace(/\[/g, '.')
            .replace(/'|"|\]/g, '')
            .replace(`${varName}.`, '')
            .split('.');
          /** Set the read as the first key */
          if (read) {
            inner.unshift(key);
            key = read;
          }
          insertValueToKeys({ inner, scopes, keys, key, defaultValue });
        });
      result = rgx.exec(str);
    }
  });
  /** directive & pipe */
  [regexs.directive, regexs.directiveTernary, regexs.pipe].forEach(rgx => {
    keys = iterateRegex({ rgx, keys, str, keepFlat, scopes, defaultValue });
  });

  return keys;
}

/**
 * Extract all the keys that exists in the template files.
 */
function extractTemplateKeys({ src, keepFlat = [], scopes, defaultValue, files }) {
  let { srcPath, keys, fileCount } = initExtraction(src);
  return new Promise(resolve => {
    if (files) {
      for (const file of files) {
        fileCount++;
        keys = performTemplateExtraction({ file, defaultValue, keepFlat, scopes, keys });
      }
      resolve({ keys, fileCount });
    } else {
      find
        .eachfile(/\.html$/, srcPath, file => {
          fileCount++;
          keys = performTemplateExtraction({ file, defaultValue, keepFlat, scopes, keys });
        })
        .end(() => {
          resolve({ keys, fileCount });
        });
    }
  });
}

/**
 * Iterates over a given regex until there a no results and adds all the keys found to the map.
 */
function iterateRegex({ rgx, keys, str, keepFlat, scopes, defaultValue }) {
  let result = rgx.exec(str);
  while (result) {
    /** support ternary operator */
    const regexKeys = result.groups.key.replace(/'|"|\s/g, '').split(':');
    for (const regexKey of regexKeys) {
      const [key, ...inner] = regexKey.split('.');
      if (keepFlat.includes(key)) {
        keys[result.groups.key] = defaultValue;
      } else {
        insertValueToKeys({ inner, scopes, keys, key, defaultValue });
      }
    }
    result = rgx.exec(str);
  }
  return keys;
}

/**
 * Creates a new translation json file.
 */
function createJson(outputPath, json) {
  fs.writeFileSync(outputPath, json, 'utf8');
}

/**
 * Verifies that the output dir (and sub-dirs) exists, if not create them.
 */
function verifyOutputDir(outputPath, folders) {
  const scopes = folders.filter(key => key !== '__global');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  for (const scope of scopes) {
    if (!fs.existsSync(`${outputPath}/${scope}`)) {
      fs.mkdirSync(`${outputPath}/${scope}`, { recursive: true });
    }
  }
}

/** Create/Merge the translation files */
function createFiles({ keys, langs, outputPath }) {
  logger.startSpinner(`${messages.creatingFiles} 🗂`);
  const scopes = Object.keys(keys);
  const langArr = langs.split(',').map(l => l.trim());
  /** Build an array of the expected translation files (based on all the scopes and langs) */
  let expectedFiles = scopes.reduce((files, scope) => {
    langArr.forEach(lang => {
      const path = scope === '__global' ? outputPath : `${outputPath}/${scope}`;
      files.push(`${path}/${lang}.json`);
    });
    return files;
  }, []);

  verifyOutputDir(outputPath, scopes);
  /** An array of the existing translation files in the output dir */
  const currentFiles = glob.sync(`${outputPath}/**/*.json`);
  /** iterate over the json files and merge the keys */
  if (currentFiles.length) {
    for (const fileName of currentFiles) {
      /** extract the lang name from the file */
      const { scope } = regexs.fileLang(outputPath).exec(fileName).groups;
      /** remove this file from the expectedFiles array since the file already exists */
      expectedFiles = expectedFiles.filter(f => f !== fileName);
      /** Read and write the merged json */
      const file = readFile(fileName);
      const merged = mergeDeep({}, scope ? keys[scope] : keys.__global, JSON.parse(file));
      fs.writeFileSync(fileName, JSON.stringify(merged, null, 2), { encoding: 'UTF-8' });
    }
  }
  /** If there are items in the array, that means that we need to create missing translation files */
  if (expectedFiles.length) {
    expectedFiles.forEach(fileName => {
      const { scope } = regexs.fileLang(outputPath).exec(fileName).groups;
      const scopeKey = scope ? scope.slice(0, -1) : '__global';
      const json = JSON.stringify(keys[scopeKey], null, 2);
      createJson(fileName, json);
    });
  }
  logger.succeed();
  if (currentFiles.length) {
    logger.succeed(messages.merged(currentFiles));
  }
  logger.log(`\n              🌵 ${messages.done} 🌵`);
}

/** Build the keys object */
function buildKeys(options) {
  return Promise.all([extractTemplateKeys(options), extractTSKeys(options)]).then(([template, ts]) => {
    const keys = mergeDeep({}, template.keys, ts.keys);
    return Promise.resolve({ keys, fileCount: template.fileCount + ts.fileCount });
  });
}

/** Extract the scope mapping from the transloco config */
function getScopesMap(configPath) {
  if (!configPath) {
    return { keysMap: {} };
  }
  const configFile = readFile(`${process.cwd()}/${configPath}`);
  const scopeMapping = /scopeMapping[\s\r\t\n]*:[\s\r\t\n]*(?<scopes>{[^}]*})/g.exec(configFile);
  let scopes = '{}';
  if (scopeMapping) {
    scopes = scopeMapping.groups.scopes;
  }
  const sanitized = scopes.trim().replace(/'/g, '"');
  const map = JSON.parse(`${sanitized}`);
  const keysMap = Object.keys(map).reduce((acc, key) => {
    const mappedScope = toCamelCase(map[key]);
    acc[mappedScope] = key;
    return acc;
  }, {});
  return { keysMap };
}

/** Merge cli input, argv and defaults */
function initProcessParams(input, config) {
  const src = input.src || config.src || defaultConfig.src;
  const langs = input.langs || config.langs || defaultConfig.langs;
  const defaultValue = input.defaultValue || config.defaultValue || defaultConfig.defaultValue;
  let output = input.output || config.output || defaultConfig.output;
  output = output.endsWith('/') ? output.slice(0, -1) : output;
  const scopes = getScopesMap(input.configPath || config.configPath);
  let keepFlat = input.keepFlat || config.keepFlat;
  keepFlat = keepFlat ? keepFlat.split(',').map(l => l.trim()) : [];

  return { src, langs, defaultValue, output, scopes, keepFlat };
}

/** The main function, collects the settings and starts the files build. */
function buildTranslationFiles({ config, basePath }) {
  logger = getLogger(config.prodMode);
  return inquirer
    .prompt(config.interactive ? queries(basePath) : [])
    .then(input => {
      const { src, langs, defaultValue, output, scopes, keepFlat } = initProcessParams(input, config);
      logger.log('\x1b[4m%s\x1b[0m', `\n${messages.startBuild(langs.length)} 👷🏗\n`);
      logger.startSpinner(`${messages.extract} 🗝`);
      const options = { src, keepFlat, scopes, defaultValue };
      return buildKeys(options).then(({ keys, fileCount }) => {
        logger.succeed(`${messages.extract} 🗝`);
        /** Count all the keys found and reduce the scopes & global keys */
        const keysFound = countKeysRecursively(keys) - Object.keys(keys).length;
        logger.log(`${messages.keysFound(keysFound, fileCount)}`);
        createFiles({ keys, langs, outputPath: `${process.cwd()}/${output}` });
      });
    })
    .catch(e => logger.log(e));
}

module.exports = {
  buildTranslationFiles,
  buildKeys,
  getScopesMap,
  readFile,
  initProcessParams,
  extractTemplateKeys,
  extractTSKeys
};
