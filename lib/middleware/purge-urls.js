'use strict';

const defaults = require('lodash/defaults');
const httpError = require('http-errors');
const httpRequest = require('request-promise-native');

module.exports = purgeUrls;

module.exports.defaults = {
	urls: []
};

function purgeUrls(options) {
	options = defaultOptions(options);

	// Return a new middleware function
	return (request, response, next) => {
		const log = request.app.origami.log;

		// If no API key is provided...
		if (!request.query.apiKey) {
			next(httpError(401, 'An apiKey query parameter is required'));

		// If an API key is provided but it is incorrect...
		} else if (request.query.apiKey !== options.purgeApiKey) {
			next(httpError(403, 'You do not have permission to purge URLs'));

		// If we have the correct key...
		} else {

			// Respond immediately
			response
				.status(202)
				.send('Purging URLs');

			// Purge all of the URLs (after a timeout)
			return new Promise(resolve => {
				const timeout = request.query.wait || 0;
				log.info(`Waiting ${timeout}ms before purging URLs`);
				setTimeout(resolve, timeout);
			})
			.then(() => {
				log.info('Purging Urls');
				return Promise.all(options.urls.map(url => {
					return httpRequest({
						uri: url,
						method: 'PURGE',
						headers: {
							'Fastly-Key': options.fastlyApiKey,
							'Fastly-Soft-Purge': 1
						},
						simple: false,
						resolveWithFullResponse: true
					})
					.then(response => {
						if (response.statusCode < 400) {
							log.info(`Purged URL from Fastly: ${url}`);
						} else if (response.statusCode === 401) {
							throw new Error(`Unable to purge URL from Fastly, permission denied for: ${url}`);
						} else {
							throw new Error(`Unable to purge URL from Fastly: ${url}`);
						}
					});
				}));
			})
			.then(() => {
				log.info('Purged URLs successfully');
			})
			.catch(error => {
				log.error(`Error purging URLs: ${error.message}`);
			});
		}

		// Always return a promise. This is used to ensure testing is consistent
		return Promise.resolve();
	};
}

// Default the middleware options
function defaultOptions(options) {
	const environmentOptions = {
		fastlyApiKey: process.env.FASTLY_PURGE_API_KEY,
		purgeApiKey: process.env.PURGE_API_KEY
	};
	return defaults({}, options, environmentOptions, module.exports.defaults);
}
