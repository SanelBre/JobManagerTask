export const sortByObjectValues = (map) =>
	Object.entries(map).sort(([, a], [, b]) => b - a);
