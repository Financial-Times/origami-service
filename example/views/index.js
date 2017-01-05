'use strict';

// Load the module (you would replace this with the
// full module name: @financial-times/origami-service)
const origamiService = require('../..');

// Create and run an Origami service with some
// overridden options
origamiService({
	name: 'Origami Service Views Example',
	basePath: __dirname,
	defaultLayout: 'main'
})

	// When the service starts...
	.then(app => {

		// Create a route
		app.get('/', (request, response) => {
			response.render('index', {
				message: 'This text is in the route.'
			});
		});

		// Mount some error handling middleware
		app.use(origamiService.middleware.notFound('The requested page does not exist'));
		app.use(origamiService.middleware.errorHandler());

	})

	// Catch and log any startup errors
	.catch(error => {
		console.error(error.message);
		process.exit(1);
	});
