'use strict';

// Load the module (you would replace this with the
// full module name: @financial-times/origami-service)
const origamiService = require('../..');

// Create and run an Origami service with some
// overridden options
origamiService({
	basePath: __dirname,
	port: 8765
})

	// When the service starts log that everything
	// is OK and output the address
	.then(app => {
		const port = app.origami.server.address().port;
		const address = `http://localhost:${port}/`;
		console.log(`Application started: ${address}`);
	})

	// Catch and log any startup errors
	.catch(error => {
		console.error(error.message);
		process.exit(1);
	});
