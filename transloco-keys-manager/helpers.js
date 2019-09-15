const ora = require('ora');

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

function buildObjFromPath(path, value) {
  const obj = {};
  let current = obj;
  while (path.length > 1) {
    const [head, ...tail] = path;
    path = tail;
    if (!current[head]) {
      current[head] = {};
    }
    current = current[head];
  }
  const [last] = path;
  current[last] = value;
  return obj;
}

function sanitizeForRegex(str) {
  return str
    .split('')
    .map(char => (['$', '^', '/'].includes(char) ? `\\${char}` : char))
    .join('');
}

function toCamelCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => (index === 0 ? word.toLowerCase() : word.toUpperCase()))
    .replace(/\s+|_|-|\//g, '');
}

function countKeysRecursively(obj) {
  return Object.keys(obj).reduce(
    (acc, curr) => (isObject(obj[curr]) ? ++acc + countKeysRecursively(obj[curr]) : ++acc),
    0
  );
}

const defaultLogger = {
  log: (...msg) => console.log(...msg),
  succeed: msg => spinner.succeed(msg),
  startSpinner: msg => (spinner = ora().start(msg))
};
const noop = () => {};
const prodModeLogger = { log: noop, startSpinner: noop, succeed: noop };

function getLogger(prodMode) {
  return prodMode ? prodModeLogger : defaultLogger;
}

module.exports = {
  mergeDeep,
  buildObjFromPath,
  isObject,
  sanitizeForRegex,
  toCamelCase,
  countKeysRecursively,
  getLogger
};
