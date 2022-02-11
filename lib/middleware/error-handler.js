'use strict';

const cacheControl = require('./cache-control');
const defaults = require('lodash/defaults');
const raven = require('raven');

module.exports = errorHandler;

module.exports.defaults = {
	outputJson: false
};

function errorHandler(options) {
	options = defaultOptions(options);

	// Handler for sending errors to Sentry
	const ravenErrorHandler = raven.errorHandler();

	// Handler for rendering to the user
	function standardErrorHandler(error, request, response) {
		const ft = request.app.ft;
		const status = error.status || error.statusCode || error.status_code || 500;
		const showStack = (status >= 500 && ft.options.environment !== 'production');
		// Attempt to render the error page
		const context = {
			title: `Error ${status}`,
			error: {
				message: error.message,
				stack: (showStack ? error.stack : undefined),
				status: status
			}
		};

		// Use the cache-control middleware to define
		// caching rules
		cacheControl({
			maxAge: error.cacheMaxAge || 0,
			staleIfError: 0
		})(request, response);

		// Set the response status
		response.status(status);

		// Output JSON if it's requested
		if (options.outputJson) {
			return response.send(context.error);
		}

		response.render('error', context, (renderError, html) => {
			// If the render fails, build some backup HTML
			if (renderError) {
				html = `
					<h1>${context.title}</h1>
					<p>${error.message}</p>
					${showStack ? `<h2>Error Stack</h2><pre>${error.stack}</pre>` : ''}
					<hr/>
					<p>As well as the above error, the application was unable to render an "error" view.</p>
					${showStack ? `<pre>${renderError.stack}</pre>` : ''}
				`;
			}
			// Output the rendered or backup HTML
			response.send(html);
		});
	}

	// Decide on which handler to use based on
	// whether Sentry has been configured
	return (error, request, response, next) => {
		if (request.app.ft.options.sentryDsn && !error.skipSentry) {
			return ravenErrorHandler(error, request, response, error => {
				standardErrorHandler(error, request, response, next);
			});
		}
		standardErrorHandler(error, request, response, next);
	};

}

// Default the middleware options
function defaultOptions(options) {
	return defaults({}, options, module.exports.defaults);
}
