import React, { useRef, useMemo } from 'react'
import PropTypes from 'prop-types'

import RouterContext from './RouterContext.js'
import useCurrentRouteChangeEffect from './useCurrentRouteChangeEffect.js'
import getRoutePath from './getRoutePath.js'

import { getFromContext, takeFromContext } from '../context.js'

export default function RouterContextValueProvider({
	location,
	routes,
	params,
	children
}) {
	const getRoute = () => ({
		location,
		params,
		path: getRoutePath(routes)
	})

	const initialRoute = useMemo(() => getRoute(), [])

	const currentRoute = useRef(initialRoute)
	const currentRouteInstantBack = useRef(false)
	const currentRouteNavigationContext = useRef(undefined)

	const routerContextValue = useRef({
		route: initialRoute
	})

	// `location` becomes `undefined` every time when router starts `.load()` a new page.
	// Then it becomes non-`undefined` when the new page is about to be rendered.
	if (location) {
		if (location !== currentRoute.current.location) {
			const route = getRoute()

			// "Navigation/IsInstantBack" and "Navigation/Context" values that're later used in `useEffect()`
			// should be snapshotted at this state — at the same stage that the "new page" route is snapshotted.
			// Otherwise, those values might potentially correspond to some other navigation (subsequent)
			// that happens right after this (current) navigation.
			const instantBack = getFromContext('Navigation/IsInstantBack')
			const navigationContext = getFromContext('Navigation/Context')

			// Store the snapshotted values in `ref`s.
			currentRoute.current = route
			currentRouteInstantBack.current = instantBack
			currentRouteNavigationContext.current = navigationContext

			// Update `RouterContext` value.
			routerContextValue.current = {
				route
			}

			onRouteChange(route, {
				instantBack,
				navigationContext
			})
		}
	}

	// `currentRouteValue` variable is created here — outside of the effect —
	// to store `currentRoute.current` `ref` value.
	// The reason is that the `ref` value, when referenced from inside `useEffect()` callback,
	// will always point to the very latest value in that `ref` at not to the `ref` value
	// that existed at the time of comparing the dependencies of the effect.
	// In other words, `ref` value inside effect callback might go out of sync with
	// itself at the time of evaluating the effect's dependencies.
	//
	// Using a variable allows "capturing" the `ref` value at a certain point in time
	// and then use that value later when the effect's callback function is run.
	// This is called "closure" in javascript language.
	//
	// For example, user navigates from `/items` to `/items/123` and "new page" event
	// is registered here, and `useEffect()` is ready to be run but the user quickly
	// navigates to `/contacts` page and all the `ref`s now store the values for that
	// `/contacts` page and not for the `/items/123` page, so the `useEffect()` callback
	// shouldn't read any values from those `ref`s since those `ref` values may have
	// already been overwritten.
	//
	const currentRouteValue = currentRoute.current
	const currentRouteInstantBackValue = currentRouteInstantBack.current
	const currentRouteNavigationContextValue = currentRouteNavigationContext.current
	//
	const prevPage = getFromContext('Root/NewPage')
	const newPage = {
		location: currentRouteValue.location,
		route: currentRouteValue.path,
		params: currentRouteValue.params,
		instantBack: currentRouteInstantBackValue,
		navigationContext: currentRouteNavigationContextValue
	}

	useCurrentRouteChangeEffect({
		currentRoute: currentRouteValue,
		prevPage,
		newPage
	})

	return React.createElement(
		RouterContext.Provider,
		{ value: routerContextValue.current },
		children
	)
}

const routeShape = {
	// A `route` doesn't always have a `path` property:
	// `found` router allows that when nesting routes.
	// Example: `{ Component: Wrapper, children: { path: '/', Component: Home } }`.
	path: PropTypes.string
}

routeShape.children = PropTypes.arrayOf(PropTypes.shape(routeShape))

const routeType = PropTypes.shape(routeShape)

RouterContextValueProvider.propTypes = {
	location: PropTypes.shape({
		origin: PropTypes.string,
		host: PropTypes.string,
		hostname: PropTypes.string,
		port: PropTypes.string,
		protocol: PropTypes.string,

		pathname: PropTypes.string.isRequired,
		query: PropTypes.objectOf(PropTypes.string).isRequired,
		search: PropTypes.string.isRequired,
		hash: PropTypes.string.isRequired,

		// Miscellaneous (not used).

		// Some kind of a possibly-likely-unique key. Is empty for the initial page.
		key: PropTypes.string,

		// History entry state. Can be empty.
		state: PropTypes.any,

		// Index in browser history stack.
		// Seems to be `undefined` during the initial client-side render
		// after the page has been rendered on the server side.
		index: PropTypes.number,

		// The "delta" in terms of `index` change as a result of the navigation.
		// For example, a regular hyperlink click is `delta: 1`.
		// A "Back" action is `delta: -1`. A user could go several pages "Back".
		delta: PropTypes.number,

		// 'PUSH' or 'REPLACE' if the location was reached via history "push" or
    // "replace" action respectively. 'POP' on the initial location, or if
		// the location was reached via the browser "Back" or "Forward" buttons
		// or via `FarceActions.go`.
		action: PropTypes.oneOf(['PUSH', 'REPLACE', 'POP']).isRequired
	}),

	routes: PropTypes.arrayOf(routeType),

	params: PropTypes.objectOf(PropTypes.string),

	children: PropTypes.node
}

function onRouteChange(route, {
	instantBack,
	navigationContext
}) {
	const newPage = {
		location: route.location,
		route: route.path,
		params: route.params,
		instantBack,
		navigationContext
	}

	const prevPage = getFromContext('Root/NewPage')

	// Trigger "before new page will be rendered" listeners.
	const beforeRenderNewPageListeners = getFromContext('Root/BeforeRenderNewPage')
	if (beforeRenderNewPageListeners) {
		for (const listener of beforeRenderNewPageListeners) {
			listener(newPage, prevPage)
		}
	}

	// Trigger "before another page will be rendered" listeners.
	const beforeRenderAnotherPageListeners = takeFromContext('Navigation/BeforeRenderAnotherPage')
	if (beforeRenderAnotherPageListeners) {
		for (const listener of beforeRenderAnotherPageListeners) {
			listener(newPage)
		}
	}
}