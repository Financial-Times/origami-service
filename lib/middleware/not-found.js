'use strict';

const httpError = require('http-errors');

module.exports = notFound;

function notFound(message) {
	return (request, response, next) => {
		next(httpError(404, message));
	};
}
