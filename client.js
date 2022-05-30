// `lib/router/client/createRouterElement.js`
//   `import` `found-scroll`
//     `import` `scroll-behavior`
//       `import` `page-lifecycle/dist/lifecycle.es5.js` (regardless of CommonJS or ESM)
//          uses `self` variable name which is not defined in Node.js
//          https://unpkg.com/browse/page-lifecycle@0.1.2/dist/lifecycle.es5.js
//
// So exporting `./lib/redux/client/setUpAndRender` in the main file
// might break Node.js if it decides to execute it (maybe it won't in ESM mode).
//
// So, the client-side rendering function was moved to a separate `/client` subpackage.
//
export { default as render } from './lib/redux/client/setUpAndRender.js'
export { default as createStore } from './lib/redux/client/createStore.js'