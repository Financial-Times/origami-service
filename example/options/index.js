'use strict';

// Load the module (you would replace this with the
// full module name: @financial-times/origami-service)
const origamiService = require('../..');

// Create and run an Origami service with some
// overridden options
origamiService({
	name: 'Origami Service Options Example',
	basePath: __dirname,
	port: 8765
})

	// When the service starts...
	.then(app => {

		// Create a route
		app.get('/', (request, response) => {
			response.render('index');
		});

	})

	// Catch and log any startup errors
	.catch(error => {
		console.error(error.message);
		process.exit(1);
	});
