// exports.updateMeta = require('./commonjs/meta/patchMeta.js').default;

exports.getState = require('./commonjs/redux/client/getState.js').default;
exports.getHttpClient = require('./commonjs/redux/client/getHttpClient.js').default;

exports.getPreferredLocale = require('./commonjs/client/locale.js').getPreferredLocale;
exports.getPreferredLocales = require('./commonjs/client/locale.js').getPreferredLocales;

exports.getLanguageFromLocale = require('./commonjs/getLanguageFromLocale.js').default;

exports.wasInstantNavigation = require('./commonjs/redux/client/instantNavigation.js').wasInstantNavigation;
exports.isInstantBackAbleNavigation = require('./commonjs/redux/client/instantNavigation.js').isInstantBackAbleNavigation;
exports.canGoBackInstantly = require('./commonjs/redux/client/instantNavigation.js').canGoBackInstantly;
exports.canGoForwardInstantly = require('./commonjs/redux/client/instantNavigation.js').canGoForwardInstantly;

exports.ReduxModule = require('./commonjs/redux/ReduxModule.js').default;

exports.underscoredToCamelCase = require('./commonjs/redux/naming.js').underscoredToCamelCase;
exports.eventName = require('./commonjs/redux/naming.js').eventName;

exports.Link = require('./commonjs/redux/Link.js').default;
exports.getCookie = require('./commonjs/client/cookies.js').getCookie;

exports.Redirect = require('./commonjs/router/index.js').Redirect;
exports.useRouter = require('./commonjs/router/index.js').useRouter;
exports.goto = require('./commonjs/router/index.js').goto;
exports.redirect = require('./commonjs/router/index.js').redirect;
exports.pushLocation = require('./commonjs/router/index.js').pushLocation;
exports.replaceLocation = require('./commonjs/router/index.js').replaceLocation;
exports.goBack = require('./commonjs/router/index.js').goBack;
exports.goBackTwoPages = require('./commonjs/router/index.js').goBackTwoPages;
exports.goForward = require('./commonjs/router/index.js').goForward;

exports.useLoading = require('./commonjs/router/useLoading.js').default;
exports.useLocation = require('./commonjs/router/useLocation.js').default;
exports.useSelectorForLocation = require('./commonjs/redux/useSelectorForLocation.js').default;
exports.useNavigationStartEffect = require('./commonjs/router/useNavigationStartEffect.js').default;
exports.useNavigationEndEffect = require('./commonjs/router/useNavigationEndEffect.js').default;
exports.useRoute = require('./commonjs/router/useRoute.js').default;

exports.updateReducers = require('./commonjs/redux/hotReload.js').updateReducers;
