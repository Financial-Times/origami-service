'use strict';

const httpError = require('http-errors');

module.exports = notFound;

function notFound(message) {
	return (request, response, next) => {
		const error = httpError(404, message);
		error.cacheMaxAge = '30s';
		next(error);
	};
}
