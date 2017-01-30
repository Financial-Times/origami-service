'use strict';

const cacheControl = require('./cache-control');
const raven = require('raven');

module.exports = errorHandler;

function errorHandler() {

	// Handler for sending errors to Sentry
	const ravenErrorHandler = raven.errorHandler();

	// Handler for rendering to the user
	function standardErrorHandler(error, request, response) {
		const origami = request.app.origami;
		const status = error.status || error.statusCode || error.status_code || 500;
		const showStack = (status >= 500 && origami.options.environment !== 'production');

		// Log server errors
		if (status >= 500) {
			let singleLineStack = null;
			if (error.stack) {
				// Error stacks are multi-line strings which are
				// padded with whitespace to indent them. We need to
				// remove this whitespace and escape newlines so
				// that Splunk registers only one event per error
				singleLineStack = error.stack
					// Split into lines
					.split('\n')
					// Remove the leading whitespace
					.map(line => line.trim())
					// Ignore the first line – this is just
					// repeating the error message that we already
					// log separately
					.slice(1)
					// Turn back into a multi-line string
					.join('\n');
				// Using JSON stringify adds quotes around the string
				// and escapes any quotes or newlines within it
				singleLineStack = JSON.stringify(singleLineStack);
			}
			origami.log.error(`Error: ${error.message} stack=${singleLineStack}`);
		}

		// Attempt to render the error page
		const context = {
			title: `Error ${status}`,
			error: {
				message: error.message,
				stack: (showStack ? error.stack : null),
				status: status
			}
		};

		// Use the cache-control middleware to define
		// caching rules
		cacheControl({
			maxAge: error.cacheMaxAge || 0,
			staleIfError: 0
		})(request, response);

		response.status(status).render('error', context, (renderError, html) => {
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
		if (request.app.origami.options.sentryDsn) {
			return ravenErrorHandler(error, request, response, error => {
				standardErrorHandler(error, request, response, next);
			});
		}
		standardErrorHandler(error, request, response, next);
	};

}
