'use strict';

// TS7 side-by-side shim for the lint process only.
// typescript-eslint@8.67 hard-refuses TypeScript 7 (it needs the TS 6 compiler API).
// This require-hook redirects `require('typescript')` (and subpaths) to the
// @typescript/typescript6 side-by-side package while the project stays on TS 7
// for tsc / next build. Scoped exclusively to `npm run lint`; no eslint config
// or business code is touched.
const Module = require('module');
const path = require('path');

const TS6_MAIN = path.resolve(__dirname, '..', 'node_modules', '@typescript', 'typescript6');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'typescript' || request.startsWith('typescript/')) {
    const sub = request.slice('typescript'.length);
    try {
      return originalResolve.call(this, TS6_MAIN + sub, parent, isMain, options);
    } catch (_) {
      return TS6_MAIN;
    }
  }
  return originalResolve.call(this, request, parent, isMain, options);
};
