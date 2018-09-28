/* eslint-env mocha */
const assert = require("assert");

const rollup = require("rollup");
const {withDir} = require("tempdir-yaml");
const endent = require("endent");

const createPlugin = require("..");

async function bundle(input, output, options = {}) {
  if (typeof output === "string") {
    output = {
      dir: output
    };
  }
  const warns = [];
  const bundle = await rollup.rollup({
    input,
    plugins: [
      createPlugin(options)
    ],
    experimentalCodeSplitting: true,
    onwarn(warn) {
      // https://github.com/rollup/rollup/issues/2308
      warns.push(warn);
    }
  });
  const modules = bundle.cache.modules.slice();
  const result = await bundle.generate({
    format: "es",
    legacy: true,
    freeze: false,
    sourcemap: true,
    ...output
  });
  result.warns = warns;
  result.modules = modules;
  return result;
}

describe("rollup-plugin-iife", () => {
  it("output iife", () =>
    withDir(`
      - entry.js: |
          import Emitter from "event-lite";
          export default () => new Emitter;
    `, async resolve => {
      const result = await bundle([resolve("entry.js")], resolve("dist"));
      assert.equal(result.output["entry.js"].code.trim(), endent`
        var entry = (function () {
        
        
        var entry = () => new eventLite;
        
        
        return entry;
        })();
      `);
    })
  );
  
  it("multiple entries", () =>
    withDir(`
      - entry.js: |
          import {foo} from "./foo.js";
          console.log(foo);
      - foo.js: |
          export const foo = "123";
    `, async resolve => {
      const result = await bundle(["entry.js", "foo.js"].map(i => resolve(i)), resolve("dist"));
      assert.equal(result.output["entry.js"].code.trim(), endent`
        (function () {
        
        
        console.log(foo.foo);
        })();
      `);
      assert.equal(result.output["foo.js"].code.trim(), endent`
        var foo = (function () {
        const foo = "123";
        
        
        return {
          foo: foo
        };
        })();
      `);
    })
  );
  
  it("names is object", () =>
    withDir(`
      - entry.js: |
          import Emitter from "event-lite";
          export default () => new Emitter;
    `, async resolve => {
      const result = await bundle([resolve("entry.js")], resolve("dist"), {
        names: {
          "./entry.js": "myVar",
          "event-lite": "EventLite"
        }
      });
      assert.equal(result.output["entry.js"].code.trim(), endent`
        var myVar = (function () {
        
        
        var entry = () => new EventLite;
        
        
        return entry;
        })();
      `);
    })
  );
  
  it("names is function", () =>
    withDir(`
      - entry.js: |
          import Emitter from "event-lite";
          export default () => new Emitter;
    `, async resolve => {
      const result = await bundle([resolve("entry.js")], resolve("dist"), {
        names: id => {
          if (id === "event-lite") {
            return "EventLite";
          }
          if (/dist.entry\.js$/.test(id)) {
            return "myVar";
          }
        }
      });
      assert.equal(result.output["entry.js"].code.trim(), endent`
        var myVar = (function () {
        
        
        var entry = () => new EventLite;
        
        
        return entry;
        })();
      `);
    })
  );
  
  it("work with output.globals", () =>
    withDir(`
      - entry.js: |
          import Vue from "vue";
          export default new Vue;
    `, async resolve => {
      const result = await bundle(
        [resolve("entry.js")],
        {
          dir: resolve("dist"),
          globals: {
            vue: 'Vue'
          }
        }
      );
      assert.equal(result.output["entry.js"].code.trim(), endent`
        var entry = (function () {
        
        
        var entry = new Vue;
        
        
        return entry;
        })();
      `);
    })
  );
});
