import React from 'react'

import { createConnectedRouter, resolver } from '@catamphetamine/found'
import { ScrollManager } from '@catamphetamine/found-scroll'

import RouteProvider from '../RouteProvider.js'

import render from '../render.js'

export default function createRouterElement(renderArgs, { dispatch, getState }) {
	const ConnectedRouter = createConnectedRouter({
		render: (renderArgs) => {
			// Force re-mount the last route component on location path change.
			// https://github.com/4Catalyzer/found/issues/199#issuecomment-415616836
			const elements = renderArgs.elements
			if (elements && window.reactPagesRemountOnNavigate !== false) {
				elements[elements.length - 1] = React.cloneElement(elements[elements.length - 1], { key: renderArgs.location.pathname })
			}
			// When a user navigates to a page, this `render()` function is called:
			// * If there's any `load()` data loader:
			//   * The first call is gonna be with `elements: undefined` and the new `location`,
			//     before the page starts loading the initial data.
			//     `<RouteProvider/>` ignores this `render()` call.
			//   * The second call is gonna be with `elements: React.Element[]` and the new `location`,
			//     after the page has loaded the initial data.
			// * Otherwise, if there's no data to load:
			//   * The page just renders with `elements: React.Element[]` and the new `location`.
			return React.createElement(
				RouteProvider,
				{
					// `elements` is `undefined` when router starts loading the next page.
					// In that case, the previous page is still rendered, so it shouldn't
					// pass the new `location` to `<RouteProvider/>` yet.
					location: elements && renderArgs.location,
					params: elements && renderArgs.params,
					routes: elements && renderArgs.routes
				},
				React.createElement(
					ScrollManager,
					{ renderArgs },
					render(renderArgs)
				)
			)
		}
	})
	return React.createElement(
		ConnectedRouter,
		{
			matchContext: {
				dispatch,
				getState
			},
			resolver,
			initialRenderArgs: renderArgs
		}
	)
}