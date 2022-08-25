export default function dropUndefinedProperties(object) {
	const keys = Object.keys(object)
	for (const key of keys) {
		if (object[key] === undefined) {
			return keys.reduce((newObject, key) => {
				if (object[key] !== undefined) {
					newObject[key] = object[key]
				}
				return newObject
			},
			{})
		}
	}
	return object
}