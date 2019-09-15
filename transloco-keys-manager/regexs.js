const { sanitizeForRegex } = require('./helpers');

const regexs = {
  structural: /<([a-zA-Z-]*)[^*>]*\*transloco=('|")\s*let\s+(?<varName>\w*)[^>]*\2>[^]+?<\/\1\s*>/g,
  templateKey: varName => new RegExp(`${varName}(?:(?:\\[(?:'|"))|\\.)([^}|:]*)`, 'g'),
  template: /<ng-template[^>]*transloco[^>]*>[^]+?<\/ng-template>/g,
  directive: /\stransloco\s*=\s*("|')(?<key>[^]+?)\1/g,
  directiveTernary: /\s\[transloco\]\s*=\s*("|')[^"'?]*\?(?<key>[^]+?)\1/g,
  pipe: /(?:(?:{{(?![^^}|'"+]*\+)[^}|'"]*)|(?:\[[^\]]*\]=(?:"|')(?![^'"+]*\+)[^'"]*))('|")(?<key>[^|}>]*)\|[^}>]*transloco/g,
  fileLang: outputPath =>
    new RegExp(`${sanitizeForRegex(outputPath)}\\/(?<scope>(?:[^\\.\\/]*\\/)*)(?<fileLang>[^./]*)\\.json`),
  serviceInjection: /[^]*(?=(?:private|protected|public)\s+(?<serviceName>[^,:()]+)\s*:\s*(?:TranslocoService\s*(?:,|\))))[^]*/g,
  translationCalls: name =>
    new RegExp(
      `(?:(?:\\s*|this\\.)${sanitizeForRegex(
        name
      )})(?:\\s*\\t*\\r*\\n*)*\\.(?:\\s*\\t*\\r*\\n*)*(?:translate|selectTranslate)\\([^'"]*('|")(?<key>[^"']*)\\1[^'")]*(?:{[^)]+?,?)?(?:[^"']*('|")(?<scope>[^"']*)\\3)?\\)`,
      'g'
    ),
  /** use the translate function directly */
  directImport: /import\s*{\s*[^}]*translate[^}]*}\s*from\s*("|')@ngneat\/transloco\1/g,
  directTranslate: /[^.]translate[\r\s\n\t]*\([\r\s\n\t]*('|")(?<key>[^,)]*)\1/g
};

module.exports = { regexs };
