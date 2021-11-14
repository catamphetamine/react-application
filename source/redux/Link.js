import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import Link from 'found/Link'

import { markImmediateNavigationAsInstantBack } from './client/instantNavigation'

export default function HyperLink({ instantBack, onClick, ...rest }) {
	const onClickHandler = useCallback((event) => {
		if (onClick) {
			onClick(event)
		}
		if (event.defaultPrevented) {
			return
		}
		markImmediateNavigationAsInstantBack(instantBack)
	}, [instantBack, onClick])
	return (
		<Link {...rest} onClick={onClickHandler}/>
	)
}

HyperLink.propTypes = {
	instantBack: PropTypes.bool,
	onClick: PropTypes.func
}