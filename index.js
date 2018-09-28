const path = require("path");
const camelcase = require("camelcase");
const {transform: iifeTransform} = require("es-iife");

function idToName(id, nameMaps) {
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
    return camelcase(name);
  }
  return camelcase(id);
}

function createPlugin({
  sourcemap = true,
  names
} = {}) {
  let isNamesResolved = false;
  
  return {
    name: "rollup-plugin-inline-js",
    renderChunk(code, {fileName}, {dir: outputDir, globals}) {
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
        name: idToName(path.resolve(outputDir, fileName), [globals, names]),
        sourcemap,
        resolveGlobal: id => idToName(resolveId(id, outputDir), [globals, names])
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
