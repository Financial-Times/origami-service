'use strict';

// Load the module (you would replace this with the
// full module name: @financial-times/origami-service)
const origamiService = require('../..');

// Create and run an Origami service with some
// overridden options
const app = origamiService({
	name: 'Origami Service Views Example',
	basePath: __dirname,
	defaultLayout: 'main'
});

// Create a route
app.get('/', (request, response) => {
	response.render('index', {
		message: 'This text is in the route.'
	});
});

// Mount some error handling middleware
app.use(origamiService.middleware.notFound('The requested page does not exist'));
app.use(origamiService.middleware.errorHandler());

// Start the application
app.listen().catch(() => {
	process.exit(1);
});
