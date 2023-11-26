import { UPDATE_MATCH, RESOLVE_MATCH, _RESOLVE_MATCH } from '../../router/actions.js'
import { getRoutesByPath, getRoutePath } from '../../router/index.js'
import mergeMeta from '../../meta/mergeMeta.js'
import applyMeta from '../../meta/applyMeta.js'
import getLocationUrl from '../../getLocationUrl.js'
import shouldSkipLoadForNavigation from '../load/shouldSkipLoadForNavigation.js'

import {
	LOAD_STARTED,
	LOAD_FINISHED,
	LOAD_FAILED
} from '../load/actions.js'

import { SET_NAVIGATION_LOCATION } from '../navigation/actions.js'

import {
	isInstantTransition,
	setInstantNavigationFlag,
	addInstantBack,
	updateInstantNavigationChainIndex,
	resetInstantNavigationChain,
	isInstantBackNavigation
} from '../client/instantNavigation.js'

import { isServerSideLoaded } from '../../client/flags.js'

import { setInContext, getFromContext, clearInContext } from '../../context.js'

const ON_PAGE_LOADED_METHOD_NAME = 'onLoaded'

// Any events listened to here are being dispatched on client side.
export default function routerMiddleware({
	routes,
	codeSplit,
	onBeforeNavigate,
	onNavigate,
	reportStats,
	context,
	stash
}) {
	let startedAt
	let previousLocation
	let previousRouteIndices

	return ({ dispatch, getState }) =>
	{
		return next => event =>
		{
			// Skip the first pass of the initial client-side render.
			// for the case when server-side rendering is used.
			if (getFromContext('InitialPage/RepeatingServerSideRenderOnClientSide')) {
				return next(event)
			}

			// `event.payload` is a `MatcherResult`/`MatchBase` object
			// in case of a `UPDATE_MATCH`/`RESOLVE_MATCH` event.
			// https://github.com/4Catalyzer/found/blob/master/src/typeUtils.ts
			const params = event.payload && event.payload.params
			const location = event.payload && event.payload.location
			const routeIndices = event.payload && event.payload.routeIndices
			const routeParams = event.payload && event.payload.routeParams

			switch (event.type) {
				// `UPDATE_MATCH` event is triggered when navigation starts (only on client side).
				// `RESOLVE_MATCH` event is triggered when navigation ends (only on client side).
				//
				case UPDATE_MATCH:
					// A workaround for `found` router bug:
					// https://github.com/4Catalyzer/found/issues/239
					// Skip `load` and other stuff for anchor link navigation.
					if (previousLocation && shouldSkipLoadForNavigation(previousLocation, location)) {
						// I guess this workaround won't work with `codeSplit: true`
						// because `codeSplit` doesn't use the global `getData` loader.
						if (!codeSplit) {
							break
						}
					}

					// Store `event.payload` for the future `_UPDATE_MATCH` event.
					if (!getFromContext('App/HasBeenRendered') && !isServerSideLoaded()) {
						setInContext('InitialPage/FakeResolveMatchEventPayload', event.payload)
					}

					// Measure `load` and `render` time.
					startedAt = Date.now()

					// If it's an instant "Back"/"Forward" navigation
					// then navigate to the page without loading it.
					// (has been previously loaded and is in Redux state)
					const _isInstantTransition =
						location.action === 'POP' &&
						previousLocation &&
						isInstantTransition(previousLocation, location)

					// Set the flag for `wasInstantNavigation()`.
					setInstantNavigationFlag(_isInstantTransition)

					// Indicates whether an `instantBack` `<Link/>` has been clicked.
					// (or if `goto()` has been called with `instantBack: true` option)
					const instantBack = isInstantBackNavigation()

					// Update instant back navigation chain.
					if (instantBack) {
						// Stores "current" (soon to be "previous") location
						// in "instant back chain", so that if "Back" is clicked
						// then such transition could be detected as "should be instant".
						addInstantBack(
							location,
							previousLocation,
							routeIndices,
							previousRouteIndices
						)
					} else if (_isInstantTransition) {
						updateInstantNavigationChainIndex(location)
					} else {
						// If current transition is not "instant back" and not "instant"
						// then reset the whole "instant back" chain.
						// Only a consequitive "instant back" navigation chain
						// preserves the ability to instantly navigate "Back".
						// Once a regular navigation takes place
						// all previous "instant back" possibilities are discarded.
						resetInstantNavigationChain()
					}

					// Set the flag for `isInstantBackAbleNavigation()`.
					// `instantBack` is for a "forward" instant-back-able navigation.
					// `_isInstantTransition` is for a "backwards" instant-back-able navigation.
					if (instantBack || _isInstantTransition) {
						setInContext('Navigation/IsInstantBack', true)
					}

					// When `UPDATE_MATCH` event is triggered, navigation starts.
					// When `RESOLVE_MATCH` event is triggered, navigation ends.
					// `RESOLVE_MATCH` event is triggered after `UPDATE_MATCH` event.
					//
					// Trigger navigation start listeners.
					if (getFromContext('App/NavigationStartListeners')) {
						for (const navigationStartListener of getFromContext('App/NavigationStartListeners')) {
							navigationStartListener()
						}
					}

					// // `RESOLVE_MATCH` is not being emitted
					// // for the first render for some reason.
					// // https://github.com/4Catalyzer/found/issues/202
					// const isFirstRender = !previousLocation
					// if (isFirstRender) {
					// 	updateMetaTags({
					// 		routes,
					// 		routeIndices,
					// 		useSelector: getter => getter(getState()),
					// 		codeSplit,
					// 		stash
					// 	})
					// } else {
					// 	// Show page loading indicator.
					// 	dispatch({ type: LOAD_STARTED, location })
					// }

					if (onBeforeNavigate) {
						onBeforeNavigate({
							dispatch,
							useSelector: getter => getter(getState()),
							location,
							params,
							context
						})
					}

					// `UPDATE_MATCH`/`RESOLVE_MATCH` events aren't triggered on server side.
					// They're only triggered on client side.
					// If there was an error while navigating to a new `location`,
					// the `load` function will catch that error and `dispatch()`
					// a `SET_NAVIGATION_LOCATION` action with the `previousLocation`.
					dispatch({ type: SET_NAVIGATION_LOCATION, location })

					// If someone requires something like `useNavigationRoute()` hook in some future:
					// dispatch({ type: SET_NAVIGATION_ROUTE, { location, params, path: getRoutePath(getRoutesByPath(routeIndices, routes)) } })

					// Show page loading indicator.
					if (isServerSideLoaded()) {
						// Show page loading indicator.
						dispatch({ type: LOAD_STARTED, location })
					} else {
						if (getFromContext('App/HasBeenRendered')) {
							// Show page loading indicator.
							dispatch({ type: LOAD_STARTED, location })
						} else {
							// The application React element doesn't get rendered
							// until the initial `load()` has finished.
							// Therefore, the usual "show loading during navigation"
							// component won't be rendered too.
							// Use `InitialLoadComponent` configuration parameter
							// to show a loading indicator during the initial load.
							//
							// `LOAD_STARTED` event is not dispatched
							// because there's no one listening to Redux state changes yet.
							//
							// `SET_NAVIGATION_LOCATION` event has been dispatched
							// to set `navigationLocation` property in Redux state.
						}
					}

					break

				// `UPDATE_MATCH` event is triggered when navigation starts (only on client side).
				// `RESOLVE_MATCH` event is triggered when navigation ends (only on client side).
				//
				// In `found` router, `RESOLVE_MATCH` is not being dispatched
				// for the first render for some weird reason.
				// https://github.com/4Catalyzer/found/issues/202
				//
				// With server-side rendering enabled,
				// initially there are two rendering passes
				// and therefore `RESOLVE_MATCH` does get dispatched
				// after the page is initialized and rendered,
				// so there's no need to work around `RESOLVE_MATCH`
				// not being dispatched (because it is dispatched).
				//
				// With server-side rendering disabled,
				// `RESOLVE_MATCH` does not get dispatched,
				// therefore a custom `_RESOLVE_MATCH` event is
				// dispatched manually to mimick a `RESOLVE_MATCH` event.
				//
				case RESOLVE_MATCH:
				case _RESOLVE_MATCH:
					if (getFromContext('Navigation/IgnoreResolveMatchRouterEvent')) {
						clearInContext('Navigation/IgnoreResolveMatchRouterEvent')
						break
					}

					// A workaround for `found` router bug:
					// https://github.com/4Catalyzer/found/issues/239
					// Skip `load` and other stuff for anchor link navigation.
					if (previousLocation && shouldSkipLoadForNavigation(previousLocation, location)) {
						// I guess this workaround won't work with `codeSplit: true`
						// because it doesn't use the global `getData` loader.
						if (!codeSplit) {
							break
						}
					}

					// `routeIndices` might be `undefined` after a `<Redirect/>`
					// is made and a user clicks the "Back" button in a web browser.
					// https://github.com/4Catalyzer/found/issues/632
					if (!routeIndices) {
						throw new Error(`"${event.type}" Redux action misses "routeIndices" property. This usually means that the target URL path "${location.pathname}" didn't match any route. ${location.pathname[0] !== '/' ? 'The target URL path is missing a leading slash: correct your routes configuration to include a leading slash for "' + location.pathname + '" path. ' : ''}See the issue for more info: https://github.com/4Catalyzer/found/issues/632`)
					}

					// `previousLocation` is only used for "instant back" navigation.
					// Therefore it can be skipped in case of anchor link navigation.
					previousLocation = location
					previousRouteIndices = routeIndices

					if (!getFromContext('App/HasBeenRendered')) {
						setInContext('App/HasBeenRendered', true)
					}

					// Call `onLoaded`.
					if (!codeSplit) {
						const routeChain = getRoutesByPath(routeIndices, routes)
						const pageRoute = routeChain[routeChain.length - 1]
						// Routes don't have `.Component` property
						// set when using `codeSplit` feature.
						const onPageLoaded = pageRoute.Component[ON_PAGE_LOADED_METHOD_NAME]
						if (onPageLoaded) {
							onPageLoaded({
								dispatch,
								useSelector: getter => getter(getState()),
								location
							})
						}
					}

					// Update `<meta/>`.
					updateMetaTags({
						routes,
						routeIndices,
						useSelector: getter => getter(getState()),
						codeSplit,
						stash
					})

					if (!getFromContext('App/InitialMetaHasBeenApplied')) {
						setInContext('App/InitialMetaHasBeenApplied', true)
					}

					if (onNavigate) {
						onNavigate({
							url: getLocationUrl(location),
							location,
							params,
							context,
							dispatch,
							useSelector: getter => getter(getState())
						})
					}

					// When `UPDATE_MATCH` event is triggered, navigation starts.
					// When `RESOLVE_MATCH` event is triggered, navigation ends.
					// `RESOLVE_MATCH` event is triggered after `UPDATE_MATCH` event.
					//
					// Trigger navigation end listeners.
					if (getFromContext('App/NavigationEndListeners')) {
						for (const navigationEndListener of getFromContext('App/NavigationEndListeners')) {
							navigationEndListener()
						}
					}
					//
					// Reset the flag for `isInstantBackAbleNavigation()`.
					clearInContext('Navigation/IsInstantBack')

					setInContext('Navigation/PreviousRoutes', routeIndices)
					setInContext('Navigation/PreviousRoutesParameters', routeParams)

					// Report page loading time.
					// This loading time will be longer then
					// the server-side one, say, by 10 milliseconds,
					// probably because the web browser making
					// an asynchronous HTTP request is slower
					// than the Node.js server making a regular HTTP request.
					// Also this includes network latency
					// for a particular website user, etc.
					// So this `load` time doesn't actually describe
					// the server-side performance.
					if (reportStats) {
						reportStats({
							url: getLocationUrl(location),
							// Concatenated route `path` string.
							// E.g. "/user/:user_id/post/:post_id"
							route: getRoutePath(getRoutesByPath(routeIndices, routes)),
							time: {
								loadAndRender: Date.now() - startedAt
							}
						})
					}

					// Hide page loading indicator.
					dispatch({ type: LOAD_FINISHED })

					// Report loading time in console for debugging.
					if (Date.now() - startedAt > 30) {
						console.log(`[react-pages] "${location.pathname}" loaded and rendered in ${Date.now() - startedAt} ms`)
					}

					break
			}

			return next(event)
		}
	}
}

function updateMetaTags({
	routes,
	routeIndices,
	useSelector,
	codeSplit,
	stash
}) {
	const routeChain = getRoutesByPath(routeIndices, routes)
	const pageRoute = routeChain[routeChain.length - 1]

	const meta = mergeMeta({
		rootMeta: codeSplit ? routes[0].meta : routes[0].Component.meta,
		pageMeta: codeSplit ? pageRoute.meta : pageRoute.Component.meta,
		useSelector,
		stash
	})

	// Update `<meta/>`.
	applyMeta(meta)
}