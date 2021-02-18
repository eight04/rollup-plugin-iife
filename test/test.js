/* eslint-env mocha */
const assert = require("assert");

const rollup = require("rollup");
const {withDir} = require("tempdir-yaml");
const {default: endent} = require("endent");
const {looksLike} = require("string-looks-like");

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
        'use strict';


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
        'use strict';


        console.log(foo.foo);
        })();
      `);
      assert.equal(result.output["foo.js"].code.trim(), endent`
        var foo = (function () {
        'use strict';
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
        'use strict';


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
        'use strict';

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
        'use strict';

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
        'use strict';

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
        'use strict';
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
        'use strict';

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
        'use strict';

        var entry = () => new EventLite;


        return entry;
        })();
      `);
    })
  );

  it("prefix multiple entries", () =>
    withDir(`
      - entry.js: |
          import {foo} from "./foo.js";
          console.log(foo);
      - foo.js: |
          export const foo = "123";
    `, async resolve => {
      const options = {
        ignoreWarning: [UNRESOLVED_IMPORT],
        prefix: "_my_"
      };
      const result = await bundle(["entry.js", "foo.js"].map(i => resolve(i)), resolve("dist"), options);
      assert.equal(result.output["entry.js"].code.trim(), endent`
        (function () {
        'use strict';

        console.log(_my_foo.foo);
        })();
      `);
      assert.equal(result.output["foo.js"].code.trim(), endent`
        var _my_foo = (function () {
        const foo = "123";


        return {
          foo: foo
        };
        })();
      `);
    })
  );

  it("don't prefix multiple entries with custom name", () =>
    withDir(`
      - entry.js: |
          import {foo} from "./foo.js";
          console.log(foo);
      - foo.js: |
          export const foo = "123";
    `, async resolve => {
      const options = {
        ignoreWarning: [UNRESOLVED_IMPORT],
        names: {
          "./foo.js": "myFoo"
        },
        prefix: "_my_"
      };
      const result = await bundle(["entry.js", "foo.js"].map(i => resolve(i)), resolve("dist"), options);
      assert.equal(result.output["entry.js"].code.trim(), endent`
        (function () {
        'use strict';

        console.log(myFoo.foo);
        })();
      `);
      assert.equal(result.output["foo.js"].code.trim(), endent`
        var myFoo = (function () {
        'use strict';
        const foo = "123";


        return {
          foo: foo
        };
        })();
      `);
    })
  );

  it("prefix multiple entries, shared module", () =>
    withDir(`
      - entry.js: |
          import {foo} from "./foo.js";
          import {bar} from "./bar.js";
          console.log(foo, bar);
      - foo.js: |
          import {bar} from "./bar.js";
          export const foo = "123" + bar;
      - bar.js: |
          export const bar = "456";
    `, async resolve => {
      const options = {
        ignoreWarning: [UNRESOLVED_IMPORT],
        prefix: "_my_"
      };
      const result = await bundle(["entry.js", "foo.js"].map(i => resolve(i)), resolve("dist"), options);
      const [hash, hash2] = looksLike(result.output["entry.js"].code, String.raw`
        (function () {
        'use strict';
          
        console.log(_my_foo{{[\w.]+}}, _my_foo{{[\w.]+}});
        })();
      `);
      const [hash3] = looksLike(result.output["foo.js"].code, String.raw`
        var _my_foo = (function () {
        'use strict';
        return {
          foo: _my_foo{{[\w.]+}}
        };
        })();
      `);
      
      assert.equal(hash.split(".")[0], hash2.split(".")[0]);
      assert.equal(hash.split(".")[0], hash3.split(".")[0]);
    })
  );
  
  it("don't prefix externals", () =>
    withDir(`
      - entry.js: |
          import foo from "foo-bar";
          console.log(foo);
          export default "OK";
    `, async resolve => {
      const options = {
        ignoreWarning: [UNRESOLVED_IMPORT],
        prefix: "_my_"
      };
      const result = await bundle(["entry.js"].map(i => resolve(i)), resolve("dist"), options);
      looksLike(result.output["entry.js"].code, String.raw`
        var _my_entry = (function () {
        'use strict';
        console.log(fooBar);
        var entry = "OK";
        
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
        'use strict';

        console.log(foo.foo);
        })();
      `);
      assert.equal(result.output["foo.js"].code.trim(), endent`
        var foo = (function () {
        'use strict';
        const foo = "123";


        return {
          foo: foo
        };
        })();
      `);
      assert.equal(result.output["bar.js"].code.trim(), "");
    })
  );
  
  it("no strict", () =>
    withDir(`
      - entry.js: |
          console.log(foo);
    `, async resolve => {
      const result = await bundle(
        resolve("entry.js"),
        resolve("dist"),
        {
          ignoreWarning: [UNRESOLVED_IMPORT, EMPTY_BUNDLE],
          strict: false
        }
      );
      assert.equal(result.output["entry.js"].code.trim(), endent`
        (function () {

        console.log(foo);
        })();
      `);
    })
  );
});
