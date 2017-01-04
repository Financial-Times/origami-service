'use strict';

const raven = require('raven');

module.exports = errorHandler;

function errorHandler() {

	// Handler for sending errors to Sentry
	const ravenErrorHandler = raven.errorHandler();

	// Handler for rendering to the user
	function standardErrorHandler(error, request, response) {
		const origami = request.app.origami;
		const status = error.status || error.statusCode || error.status_code || 500;

		// TODO switch this to use Handlebars when it's added
		if (status >= 500) {
			origami.log.error(`Error: ${error.message}`);
		}
		let stack = '';
		if (status >= 500 && origami.options.environment !== 'production') {
			stack = `<pre>${error.stack}</pre>`;
		}
		response.status(status).send(`
			<h1>Error ${status}</h1>
			<p>${error.message}</p>
			${stack}
		`);
	}

	// Decide on which handler to use based on
	// whether Sentry has been configured
	return (error, request, response, next) => {
		if (request.app.origami.options.sentryDsn) {
			return ravenErrorHandler(error, request, response, error => {
				standardErrorHandler(error, request, response, next);
			});
		}
		standardErrorHandler(error, request, response, next);
	};

}
