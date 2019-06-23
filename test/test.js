/* eslint-env mocha */
const assert = require("assert");

const rollup = require("rollup");
const {withDir} = require("tempdir-yaml");
const endent = require("endent");

const createPlugin = require("..");

const UNRESOLVED_IMPORT = "UNRESOLVED_IMPORT";
const EMPTY_BUNDLE = "EMPTY_BUNDLE";

async function bundle(input, output, {ignoreWarning = [], ...options} = {}) {

  if (typeof output === "string") {
    output = {
      dir: output
    };
  }
  const bundle = await rollup.rollup({
    input,
    plugins: [
      createPlugin(options)
    ],
    onwarn(warn) {
      if (ignoreWarning.includes(warn.code)) {
        return;
      }
      throw warn;
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
  result.modules = modules;
  for (const o of result.output) {
    result.output[o.fileName] = o;
  }
  return result;
}

describe("rollup-plugin-iife", () => {
  it("output iife", () =>
    withDir(`
      - entry.js: |
          import Emitter from "event-lite";
          export default () => new Emitter;
    `, async resolve => {
      const result = await bundle([resolve("entry.js")], resolve("dist"), {ignoreWarning: [UNRESOLVED_IMPORT]});
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
      const result = await bundle(["entry.js", "foo.js"].map(i => resolve(i)), resolve("dist"), {ignoreWarning: [UNRESOLVED_IMPORT]});
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
        ignoreWarning: [UNRESOLVED_IMPORT],
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
        ignoreWarning: [UNRESOLVED_IMPORT],
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
        },
        {ignoreWarning: [UNRESOLVED_IMPORT]}
      );
      assert.equal(result.output["entry.js"].code.trim(), endent`
        var entry = (function () {


        var entry = new Vue;


        return entry;
        })();
      `);
    })
  );

  it("options.names should overwrite output.globals", () =>
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
        },
        {
          ignoreWarning: [UNRESOLVED_IMPORT],
          names: {
            vue: "NotVue"
          }
        }
      );
      assert.equal(result.output["entry.js"].code.trim(), endent`
        var entry = (function () {


        var entry = new NotVue;


        return entry;
        })();
      `);
    })
  );

  it("options.prefix should add prefix to name", () =>
    withDir(`
      - entry.js: |
          export const foo = "123";
    `, async resolve => {
      const result = await bundle(
        [resolve("entry.js")],
        {
          dir: resolve("dist"),
        },
        {
          ignoreWarning: [UNRESOLVED_IMPORT],
          prefix: '_my_'
        }
      );
      assert.equal(result.output["entry.js"].code.trim(), endent`
        var _my_entry = (function () {
        const foo = "123";


        return {
          foo: foo
        };
        })();
      `);
    })
  );

  it("prefix should not affect user-defined names in object", () =>
    withDir(`
      - entry.js: |
          import Emitter from "event-lite";
          export default () => new Emitter;
    `, async resolve => {
      const result = await bundle([resolve("entry.js")], resolve("dist"), {
        ignoreWarning: [UNRESOLVED_IMPORT],
        prefix: '_my_',
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

  it("prefix should not affect user-defined names in function", () =>
    withDir(`
      - entry.js: |
          import Emitter from "event-lite";
          export default () => new Emitter;
    `, async resolve => {
      const result = await bundle([resolve("entry.js")], resolve("dist"), {
        ignoreWarning: [UNRESOLVED_IMPORT],
        prefix: '_my_',
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

  it("work with empty chunks", () =>
    withDir(`
      - entry.js: |
          import {foo} from "./foo.js";
          console.log(foo);
      - foo.js: |
          export const foo = "123";
      - bar.js: |
    `, async resolve => {
      const result = await bundle(["entry.js", "foo.js", "bar.js"].map(i => resolve(i)), resolve("dist"), {ignoreWarning: [UNRESOLVED_IMPORT, EMPTY_BUNDLE]});
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
      assert.equal(result.output["bar.js"].code.trim(), "");
    })
  );
});
