const path = require("path");
const camelcase = require("camelcase");
const {transform: iifeTransform} = require("es-iife");

function createPlugin({
  sourcemap = true,
  names
} = {}) {
  let isNamesResolved = false;
  
  return {
    name: "rollup-plugin-inline-js",
    renderChunk(code, {fileName}, {dir: outputDir}) {
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
        name: idToName(path.resolve(outputDir, fileName)),
        sourcemap,
        resolveGlobal: id => idToName(resolveId(id, outputDir))
      });
    }
  };
  
  function resolveId(id, dir) {
    if (id.startsWith(".")) {
      return path.resolve(dir, id);
    }
    return id;
  }
  
  function idToName(id) {
    if (typeof names === "function") {
      return names(id);
    }
    if (names && typeof names === "object") {
      return names[id];
    }
    if (path.isAbsolute(id)) {
      const {name} = path.parse(id);
      return camelcase(name);
    }
    return camelcase(id);
  }
}

module.exports = createPlugin;
