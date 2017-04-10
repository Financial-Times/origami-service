'use strict';

const defaults = require('lodash/defaults');
const express = require('express');
const expressHandlebars = require('express-handlebars');
const expressWebService = require('@financial-times/express-web-service');
const Metrics = require('next-metrics').Metrics;
const morgan = require('morgan');
const path = require('path');
const querystring = require('querystring');
const raven = require('raven');
const requireAll = require('require-all');
const varname = require('varname');

module.exports = origamiService;

module.exports.defaults = {
	about: {},
	basePath: process.cwd(),
	defaultLayout: false,
	environment: 'development',
	exposeErrorEndpoint: false,
	graphiteApiKey: null,
	log: console,
	port: 8080,
	region: 'EU',
	requestLogFormat: 'combined',
	sentryDsn: null
};

// Middleware exports
module.exports.middleware = requireAll({
	dirname: `${__dirname}/middleware`,
	map: varname.camelback
});

// Function to create an Origami Service app
function origamiService(options) {

	// Default the passed in options so we know we've got
	// everything that we need to start up
	options = defaultOptions(options);
	const paths = {
		base: path.join(options.basePath),
		manifest: path.join(options.basePath, 'package.json'),
		public: path.join(options.basePath, 'public'),
		views: path.join(options.basePath, 'views'),
		layouts: path.join(options.basePath, 'views/layouts'),
		partials: path.join(options.basePath, 'views/partials')
	};

	// Load the application manifest and use it
	// to default some more options
	let manifest = {};
	try {
		manifest = require(paths.manifest);
	} catch (error) {}
	options.about.name = options.about.name || manifest.name || 'Origami Service';
	options.about.purpose = options.about.purpose || manifest.description || 'An Origami web service.';
	options.about.schemaVersion = options.about.schemaVersion || 1;

	// Create the Express application
	const app = createExpressApp(options, paths);

	// Set up Graphite metrics
	let metrics = null;
	if (options.graphiteApiKey) {
		metrics = new Metrics();
		metrics.init({
			app: options.metricsAppName || options.about.systemCode || options.about.name,
			flushEvery: 40000,
			ftApiKey: options.graphiteApiKey,
			hostedApiKey: false
		});
		// Note: it's important for testing that this be the first
		// call to `app.use`
		app.use((request, response, next) => {
			metrics.instrument(request, {
				as: 'express.http.req'
			});
			metrics.instrument(response, {
				as: 'express.http.res'
			});
			next();
		});
	} else {
		metrics = {
			count: function() {}
		};
		options.log.warn('Warning: metrics are not being recorded for this application. Please provide a GRAPHITE_API_KEY environment variable');
	}

	// Set up Raven/Sentry request middleware
	if (options.sentryDsn) {
		raven.config(options.sentryDsn).install();
		app.use(raven.requestHandler());
	} else {
		options.log.warn('Warning: errors are not being logged to Sentry for this application. Please provide a SENTRY_DSN environment variable');
	}

	// Set up Express Web Service to provide the
	// __about, __health, __gtg endpoints
	const expressWebServiceRoutes = [
		'about',
		'gtg',
		'health'
	];
	if (options.exposeErrorEndpoint) {
		expressWebServiceRoutes.push('error');
	}
	app.use(expressWebService({
		manifestPath: paths.manifest,
		about: options.about,
		goodToGoTest: options.goodToGoTest,
		healthCheck: options.healthCheck,
		routes: expressWebServiceRoutes
	}));

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

	// Log information about how the application was configured
	const optionReport = querystring.stringify({
		graphite: !!options.graphiteApiKey,
		logging: !!options.requestLogFormat,
		sentry: !!options.sentryDsn
	}, ' ');
	options.log.info(`${options.about.name} configured (${optionReport})`);

	// Set up the app.origami property, which we'll use to
	// store additional info that routes might need. This
	// also gets added to locals so is available in views
	app.origami = app.locals.origami = {
		log: options.log,
		metrics,
		options,
		paths
	};

	// Promisify app.listen
	app._originalListen = app.listen;
	app.listen = listen.bind(null, app);

	return app;
}

// Default the application options
function defaultOptions(options) {
	const environmentOptions = {
		environment: process.env.NODE_ENV,
		exposeErrorEndpoint: process.env.EXPOSE_ERROR_ENDPOINT,
		graphiteApiKey: process.env.GRAPHITE_API_KEY,
		port: process.env.PORT,
		region: process.env.REGION,
		sentryDsn: process.env.SENTRY_DSN
	};
	return defaults({}, options, environmentOptions, module.exports.defaults);
}

// Create and configure an Express application
function createExpressApp(options, paths) {
	const app = express();

	app.enable('case sensitive routing');
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
	return (request.path === '/favicon.ico');
}

// Promisify the starting of an Express app
function listen(app) {
	return new Promise((resolve, reject) => {
		const log = app.origami.log;
		const options = app.origami.options;
		app.origami.server = app._originalListen(options.port, error => {
			if (error) {
				log.error(`${options.about.name} startup error (${error.message})`);
				return reject(error);
			}
			log.info(`${options.about.name} started (env=${options.environment} port=${options.port})`);
			resolve(app);
		});
	});
}
