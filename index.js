const path = require("path");
const camelcase = require("camelcase");
const {transform: iifeTransform} = require("es-iife");

function idToName(id, nameMaps, prefix = "") {
  let {name} = path.parse(id);
  for (const names of nameMaps) {
    if (typeof names === "function") {
      var n = names(name);
    } else if (names && typeof names === "object") {
      n = names[name];
    }
    if (n) {
      return n;
    }
  }
  if (path.isAbsolute(id)) {
    return prefix + camelcase(name);
  }
  return prefix + camelcase(name);
}

function createPlugin({
  sourcemap = true,
  names,
  prefix
} = {}) {
  let isNamesResolved = false;

  return {
    name: "rollup-plugin-inline-js",
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
        name: idToName(fileName, [names, globals], prefix),
        sourcemap,
        resolveGlobal: id => idToName(id, [names, globals], prefix)
      });
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
