'use strict';

// Load the module (you would replace this with the
// full module name: @financial-times/origami-service)
const origamiService = require('../..');

// Create and run an Origami service
origamiService({
	basePath: __dirname
})

	// When the service starts...
	.then(app => {

		// log that everything is OK and output the address
		const port = app.origami.server.address().port;
		const address = `http://localhost:${port}/`;
		console.log(`Application started: ${address}`);

		// Create a route
		app.get('/', (request, response) => {
			response.send('Hello World!');
		});

		// Mount some error handling middleware
		app.use(origamiService.middleware.notFound('The requested page does not exist'));

	})

	// Catch and log any startup errors
	.catch(error => {
		console.error(error.message);
		process.exit(1);
	});
