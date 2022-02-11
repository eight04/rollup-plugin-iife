const path = require("path");
const camelcase = require("lodash/camelCase");
const {transform: iifeTransform} = require("es-iife");

const IMPORT_META_URL = '(typeof document !== "undefined" && document.currentScript && document.currentScript.src || typeof location !== "undefined" && location.href || "")';

function idToName(id, nameMaps, prefix = "") {
  for (const names of nameMaps) {
    let name;
    if (typeof names === "function") {
      name = names(id);
    } else if (names && typeof names === "object") {
      name = names[id];
    }
    if (name) {
      return name;
    }
  }
  if (path.isAbsolute(id)) {
    const {name} = path.parse(id);
    return prefix + camelcase(name);
  }
  return camelcase(id);
}

function createPlugin({
  sourcemap = true,
  names,
  prefix,
  strict = true,
  scriptLoader = null
} = {}) {
  let isNamesResolved = false;

  return {
    name: "rollup-plugin-iife",
    renderChunk(code, {fileName}, {dir: outputDir, globals}) {
      if (!code) {
        return null;
      }
      if (names && typeof names === "object" && !isNamesResolved) {
        const output = {};
        for (const [key, value] of Object.entries(names)) {
          output[resolveId(key, outputDir)] = value;
        }
        names = output;
        isNamesResolved = true;
      }

      return iifeTransform({
        code,
        parse: this.parse,
        name: idToName(path.resolve(outputDir, fileName), [names, globals], prefix),
        sourcemap,
        resolveGlobal: id => idToName(resolveId(id, outputDir), [names, globals], prefix),
        strict
      });
    },
    resolveImportMeta(prop, {moduleId}) {
      if (prop === "url") {
        return IMPORT_META_URL;
      }
      this.error(`Unconverted import.meta.${prop} in ${moduleId}`);
    },
    renderDynamicImport() {
      if (!scriptLoader) {
        return null;
      }
      return {
        left: `${scriptLoader}(`,
        right: `, ${IMPORT_META_URL})`
      };
    }
  };

  function resolveId(id, dir) {
    if (id.startsWith(".")) {
      return path.resolve(dir, id);
    }
    return id;
  }
}

module.exports = createPlugin;
