'use strict';

// Load the module (you would replace this with the
// full module name: @financial-times/origami-service)
const origamiService = require('../..');

// Create and run an Origami service
const app = origamiService({
	name: 'Origami Service Basic Example',
	basePath: __dirname
});

// Create a route
app.get('/', (request, response) => {
	response.render('index');
});

// Start the application
app.listen().catch(() => {
	process.exit(1);
});
