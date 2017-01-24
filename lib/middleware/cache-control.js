'use strict';

const ms = require('ms');

module.exports = cacheControl;

function cacheControl(options) {
	const cacheControlHeader = getCacheDirectives(options).join(', ');
	return (request, response, next) => {
		response.set('Cache-Control', cacheControlHeader);
		if (typeof next === 'function') {
			next();
		}
	};
}

function getCacheDirectives(options) {
	options = processOptions(options);
	const directives = [
		`max-age=${options.maxAge}`
	];
	if (options.maxAge === 0) {
		return directives.concat([
			'must-revalidate',
			'no-cache',
			'no-store'
		]);
	}
	directives.push('public');
	if (options.staleIfError) {
		directives.push(`stale-if-error=${options.staleIfError}`);
	}
	if (options.staleWhileRevalidate) {
		directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
	}
	return directives;
}

function processOptions(options) {
	options.maxAge = (options.maxAge ? ms(options.maxAge) / 1000 : 0);
	if (options.staleIfError || options.staleIfError === undefined) {
		options.staleIfError = (options.staleIfError ? ms(options.staleIfError) / 1000 : options.maxAge);
	}
	if (options.staleWhileRevalidate || options.staleWhileRevalidate === undefined) {
		options.staleWhileRevalidate = (options.staleWhileRevalidate ? ms(options.staleWhileRevalidate) / 1000 : options.maxAge);
	}
	return options;
}
