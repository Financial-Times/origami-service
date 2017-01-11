'use strict';

// Load the module (you would replace this with the
// full module name: @financial-times/origami-service)
const origamiService = require('../..');

// Create and run an Origami service
const app = origamiService({
	about: {
		name: 'Origami Service Middleware Example'
	},
	basePath: __dirname
});

// Create a route
app.get('/', (request, response) => {
	response.render('index');
});

// Mount some error handling middleware
app.use(origamiService.middleware.notFound('The requested page does not exist'));
app.use(origamiService.middleware.errorHandler());

// Start the application
app.listen().catch(() => {
	process.exit(1);
});
