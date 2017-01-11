'use strict';

// Load the module (you would replace this with the
// full module name: @financial-times/origami-service)
const origamiService = require('../..');

// Create and run an Origami service with some
// overridden options
const app = origamiService({
	about: {
		name: 'Origami Service Options Example'
	},
	basePath: __dirname,
	port: 8765
});

// Create a route
app.get('/', (request, response) => {
	response.render('index');
});

// Start the application
app.listen().catch(() => {
	process.exit(1);
});
