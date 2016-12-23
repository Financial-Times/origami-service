'use strict';

const express = require('express');
const defaults = require('lodash/defaultsDeep');

module.exports = origamiService;

module.exports.defaults = {
	port: 8080,
	region: 'EU'
};

// Function to create an Origami Service app
function origamiService(options) {

	// Default the passed in options so we know we've got
	// everything that we need to start up
	options = defaults({}, options, module.exports.defaults);

	// Create the Express application
	const app = express();

	// Set up the app.origami property, which we'll use to
	// store additional info that routes might need
	app.origami = {options};

	// Return the start promise
	return promiseToStart(app);
}

// Promisify the starting of an Express app
function promiseToStart(app) {
	return new Promise((resolve, reject) => {
		app.origami.server = app.listen(app.origami.options.port, error => {
			if (error) {
				return reject(error);
			}
			resolve(app);
		});
	});
}
