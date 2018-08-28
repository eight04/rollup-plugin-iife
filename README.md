rollup-plugin-iife
==================

[![Build Status](https://travis-ci.org/eight04/rollup-plugin-iife.svg?branch=master)](https://travis-ci.org/eight04/rollup-plugin-iife)
[![Coverage Status](https://coveralls.io/repos/github/eight04/rollup-plugin-iife/badge.svg?branch=master)](https://coveralls.io/github/eight04/rollup-plugin-iife?branch=master)
[![install size](https://packagephobia.now.sh/badge?p=rollup-plugin-iife)](https://packagephobia.now.sh/result?p=rollup-plugin-iife)

Currently (rollup@0.65), [rollup doesn't support code splitting with IIFE output](https://github.com/rollup/rollup/issues/2072). This plugin would transform ES module output into IIFEs.

Installation
------------

```
npm install -D rollup-plugin-iife
```

Usage
-----

```js
import iife from "rollup-plugin-iife";

export default {
  input: ["entry.js", "entry2.js"],
  output: {
    dir: "dist",
    format: "es"
  },
  plugins: [iife()]
};
```

API
----

This module exports a single function.

### createPlugin

```js
const plugin = createPlugin({
  names?: Function|Object,
  sourcemap?: Boolean
});
```

Create the plugin instance.

If `names` is a function, the signature is:

```js
(moduleId: String) => globalVariableName: String
```

If `names` is an object, it is a `moduleId`/`globalVariableName` map. `moduleId` can be relative to the output folder (e.g. `./entry.js`), the plugin would resolve it to the absolute path.

If the plugin can't find a proper variable name, it would generate one according to its filename with [camelcase](https://www.npmjs.com/package/camelcase).

If `sourcemap` is false then don't generate the sourcemap. Default: `true`.

Changelog
---------

* 0.1.0 (Next)

  - First release.
