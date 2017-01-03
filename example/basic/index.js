'use strict';

// Load the module (you would replace this with the
// full module name: @financial-times/origami-service)
const origamiService = require('../..');

// Create and run an Origami service
origamiService({
	name: 'Origami Service Basic Example',
	basePath: __dirname
})

	// When the service starts...
	.then(app => {

		// Create a route
		app.get('/', (request, response) => {
			response.send('Hello World!');
		});

	})

	// Catch and log any startup errors
	.catch(error => {
		console.error(error.message);
		process.exit(1);
	});
