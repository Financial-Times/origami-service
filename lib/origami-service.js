'use strict';

const defaults = require('lodash/defaults');
const errorHandler = require('./middleware/error-handler');
const express = require('express');
const expressHandlebars = require('express-handlebars');
const morgan = require('morgan');
const notFound = require('./middleware/not-found');
const path = require('path');
const raven = require('raven');

module.exports = origamiService;

module.exports.defaults = {
	basePath: process.cwd(),
	defaultLayout: false,
	environment: 'development',
	log: console,
	name: 'Origami Service',
	port: 8080,
	region: 'EU',
	requestLogFormat: 'combined',
	sentryDsn: null,
	start: true
};

// Middleware exports
module.exports.middleware = {
	errorHandler,
	notFound
};

// Function to create an Origami Service app
function origamiService(options) {

	// Default the passed in options so we know we've got
	// everything that we need to start up
	options = defaultOptions(options);
	const paths = {
		base: path.join(options.basePath),
		public: path.join(options.basePath, 'public'),
		views: path.join(options.basePath, 'views'),
		layouts: path.join(options.basePath, 'views/layouts'),
		partials: path.join(options.basePath, 'views/partials')
	};

	// Create the Express application
	const app = createExpressApp(options, paths);

	// Set up Raven/Sentry request middleware
	if (options.sentryDsn) {
		raven.config(options.sentryDsn).install();
		app.use(raven.requestHandler());
	}

	// Set up a request logger
	if (options.requestLogFormat) {
		app.use(morgan(options.requestLogFormat, {
			skip: requestLogSkip
		}));
	}

	// Set up an Express static middleware for serving files
	app.use(express.static(paths.public, {
		maxAge: (options.environment === 'production' ? 604800000 : 0)
	}));

	// Set up the app.origami property, which we'll use to
	// store additional info that routes might need. This
	// also gets added to locals so is available in views
	app.origami = app.locals.origami = {
		log: options.log,
		options,
		paths
	};

	// Return the start promise
	if (options.start) {
		return promiseToStart(app);
	}
	return Promise.resolve(app);
}

// Default the application options
function defaultOptions(options) {
	const environmentOptions = {
		environment: process.env.NODE_ENV,
		port: process.env.PORT,
		region: process.env.REGION,
		sentryDsn: process.env.SENTRY_DSN || process.env.RAVEN_URL
	};
	return defaults({}, options, environmentOptions, module.exports.defaults);
}

// Create and configure an Express application
function createExpressApp(options, paths) {
	const app = express();

	app.set('env', options.environment);
	app.set('json spaces', 4);
	app.disable('x-powered-by');

	const handlebars = expressHandlebars.create({
		defaultLayout: options.defaultLayout,
		extname: 'html',
		layoutsDir: paths.layouts,
		partialsDir: paths.partials
	});
	app.engine('html', handlebars.engine);
	app.set('views', paths.views);
	app.set('view engine', 'html');

	return app;
}

// Function to determine whether request logging
// should be skipped
function requestLogSkip(request) {
	const pathEnd = request.path.replace(/\/$/, '').split('/').pop();
	return (request.path === '/favicon.ico' || pathEnd.startsWith('__'));
}

// Promisify the starting of an Express app
function promiseToStart(app) {
	return new Promise((resolve, reject) => {
		const log = app.origami.log;
		const options = app.origami.options;
		app.origami.server = app.listen(options.port, error => {
			if (error) {
				log.error(`${options.name} startup error (${error.message})`);
				return reject(error);
			}
			log.info(`${options.name} started (env=${options.environment} port=${options.port})`);
			resolve(app);
		});
	});
}
