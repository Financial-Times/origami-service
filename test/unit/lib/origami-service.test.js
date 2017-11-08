'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const path = require('path');
const sinon = require('sinon');

describe('lib/origami-service', () => {
	let defaults;
	let express;
	let expressHandlebars;
	let expressWebService;
	let log;
	let manifest;
	let morgan;
	let nextMetrics;
	let origamiService;
	let raven;
	let requireAll;
	let varname;

	beforeEach(() => {
		defaults = sinon.spy(require('lodash/defaults'));
		mockery.registerMock('lodash/defaults', defaults);

		express = require('../mock/express.mock');
		mockery.registerMock('express', express);

		expressHandlebars = require('../mock/express-handlebars.mock');
		mockery.registerMock('express-handlebars', expressHandlebars);

		expressWebService = require('../mock/express-web-service.mock');
		mockery.registerMock('@financial-times/express-web-service', expressWebService);

		log = require('../mock/log.mock');
		mockery.registerMock('log', log);

		manifest = {
			name: 'mock-manifest-name',
			description: 'mock-manifest-description'
		};
		mockery.registerMock('mock-base-path/package.json', manifest);

		morgan = require('../mock/morgan.mock');
		mockery.registerMock('morgan', morgan);

		nextMetrics = require('../mock/next-metrics.mock');
		mockery.registerMock('next-metrics', nextMetrics);

		raven = require('../mock/raven.mock');
		mockery.registerMock('raven', raven);

		requireAll = require('../mock/require-all.mock');
		mockery.registerMock('require-all', requireAll);

		varname = require('../mock/varname.mock');
		mockery.registerMock('varname', varname);

		origamiService = require('../../..');
	});

	it('exports a function', () => {
		assert.isFunction(origamiService);
	});

	it('has a `defaults` property', () => {
		assert.isObject(origamiService.defaults);
	});

	describe('.defaults', () => {

		it('has an `about` property', () => {
			assert.deepEqual(origamiService.defaults.about, {});
		});

		it('has a `basePath` property', () => {
			assert.strictEqual(origamiService.defaults.basePath, process.cwd());
		});

		it('has an `defaultLayout` property', () => {
			assert.strictEqual(origamiService.defaults.defaultLayout, false);
		});

		it('has an `environment` property', () => {
			assert.strictEqual(origamiService.defaults.environment, 'development');
		});

		it('has an `exposeErrorEndpoint` property', () => {
			assert.isFalse(origamiService.defaults.exposeErrorEndpoint);
		});

		it('has a `graphiteApiKey` property', () => {
			assert.isNull(origamiService.defaults.graphiteApiKey);
		});

		it('has a `log` property', () => {
			assert.strictEqual(origamiService.defaults.log, console);
		});

		it('has a `port` property', () => {
			assert.strictEqual(origamiService.defaults.port, 8080);
		});

		it('has a `region` property', () => {
			assert.strictEqual(origamiService.defaults.region, 'EU');
		});

		it('has a `requestLogFormat` property', () => {
			assert.strictEqual(origamiService.defaults.requestLogFormat, 'combined');
		});

		it('has a `sentryDsn` property', () => {
			assert.isNull(origamiService.defaults.sentryDsn);
		});

	});

	it('calls `requireAll` with the middleware path and a variable name converter', () => {
		assert.calledOnce(requireAll);
		assert.isObject(requireAll.firstCall.args[0]);
		assert.strictEqual(requireAll.firstCall.args[0].dirname, path.resolve(`${__dirname}/../../../lib/middleware`));
		assert.strictEqual(requireAll.firstCall.args[0].map, varname.camelback);
	});

	it('has a `middleware` property set to the return value of the `requireAll`', () => {
		assert.strictEqual(origamiService.middleware, requireAll.mockModules);
	});

	describe('origamiService(options)', () => {
		let app;
		let options;

		beforeEach(() => {

			// Define options in the environment and
			// as an object (which takes priority)
			process.env.EXPOSE_ERROR_ENDPOINT = '';
			process.env.GRAPHITE_API_KEY = 'env-graphite-api-key';
			process.env.NODE_ENV = 'production';
			process.env.PORT = 5678;
			process.env.REGION = 'The Moon';
			process.env.SENTRY_DSN = 'env-sentry-dsn';
			options = {
				about: {
					schemaVersion: 1,
					name: 'Test App',
					purpose: 'A test application.',
					systemCode: 'test-app'
				},
				basePath: 'mock-base-path',
				defaultLayout: 'mock-default-layout',
				environment: 'test',
				exposeErrorEndpoint: false,
				goodToGoTest: sinon.spy(),
				graphiteApiKey: 'mock-graphite-api-key',
				healthCheck: sinon.spy(),
				log: log,
				metricsAppName: 'mock-metrics-app-name',
				port: 1234,
				region: 'US',
				requestLogFormat: 'mock-log-format',
				sentryDsn: 'mock-sentry-dsn'
			};

			app = origamiService(options);
		});

		it('defaults the passed in options', () => {
			assert.isObject(defaults.firstCall.args[0]);
			assert.strictEqual(defaults.firstCall.args[1], options);
			assert.deepEqual(defaults.firstCall.args[2], {
				environment: process.env.NODE_ENV,
				exposeErrorEndpoint: process.env.EXPOSE_ERROR_ENDPOINT,
				graphiteApiKey: process.env.GRAPHITE_API_KEY,
				port: process.env.PORT,
				region: process.env.REGION,
				sentryDsn: process.env.SENTRY_DSN
			});
			assert.strictEqual(defaults.firstCall.args[3], origamiService.defaults);
		});

		it('creates an Express application', () => {
			assert.calledOnce(express);
		});

		it('enables the `case sensitive routing` Express setting', () => {
			assert.calledWithExactly(express.mockApp.enable, 'case sensitive routing');
		});

		it('sets the `env` Express setting to `options.environment`', () => {
			assert.calledWithExactly(express.mockApp.set, 'env', options.environment);
		});

		it('sets the `json spaces` Express setting', () => {
			assert.calledWithExactly(express.mockApp.set, 'json spaces', 4);
		});

		it('disables the `x-powered-by` Express setting', () => {
			assert.calledWithExactly(express.mockApp.disable, 'x-powered-by');
		});

		it('creates an Express Handlebars instance and adds it to Express as an engine', () => {
			assert.calledOnce(expressHandlebars.create);
			assert.calledWith(expressHandlebars.create, {
				defaultLayout: options.defaultLayout,
				extname: 'html',
				layoutsDir: 'mock-base-path/views/layouts',
				partialsDir: 'mock-base-path/views/partials'
			});
			assert.calledOnce(express.mockApp.engine);
			assert.calledWithExactly(express.mockApp.engine, 'html', expressHandlebars.mockInstance.engine);
		});

		it('sets the `views` Express setting', () => {
			assert.calledWithExactly(express.mockApp.set, 'views', 'mock-base-path/views');
		});

		it('sets the `view engine` Express setting', () => {
			assert.calledWithExactly(express.mockApp.set, 'view engine', 'html');
		});

		it('configures and initialises Next Metrics', () => {
			assert.calledOnce(nextMetrics.Metrics);
			assert.calledOnce(nextMetrics.mockInstance.init);
			assert.calledWith(nextMetrics.mockInstance.init, {
				app: options.metricsAppName,
				flushEvery: 40000,
				ftApiKey: options.graphiteApiKey,
				hostedApiKey: false
			});
		});

		it('mounts a middleware which instruments the request and response with Next Metrics', () => {
			const middleware = app.use.firstCall.args[0];
			const next = sinon.spy();
			assert.notCalled(nextMetrics.mockInstance.instrument);
			middleware(express.mockRequest, express.mockResponse, next);
			assert.calledTwice(nextMetrics.mockInstance.instrument);
			assert.calledWith(nextMetrics.mockInstance.instrument, express.mockRequest, {
				as: 'express.http.req'
			});
			assert.calledWith(nextMetrics.mockInstance.instrument, express.mockResponse, {
				as: 'express.http.res'
			});
			assert.calledOnce(next);
			assert.calledWithExactly(next);
		});

		it('configures and installs Raven', () => {
			assert.calledOnce(raven.config);
			assert.calledOnce(raven.install);
			assert.calledWithExactly(raven.config, options.sentryDsn);
		});

		it('creates and mounts Raven request handler middleware', () => {
			assert.calledOnce(raven.requestHandler);
			assert.calledWithExactly(express.mockApp.use, raven.mockRequestMiddleware);
		});

		it('creates and mounts Express Web Service middleware', () => {
			assert.calledOnce(expressWebService);
			assert.isObject(expressWebService.firstCall.args[0]);
			assert.deepEqual(expressWebService.firstCall.args[0], {
				manifestPath: 'mock-base-path/package.json',
				about: options.about,
				goodToGoTest: options.goodToGoTest,
				healthCheck: options.healthCheck,
				routes: [
					'about',
					'gtg',
					'health'
				]
			});
			assert.calledWithExactly(express.mockApp.use, expressWebService.mockMiddleware);
		});

		it('creates and mounts Morgan middleware', () => {
			assert.calledOnce(morgan);
			assert.calledWith(morgan, 'mock-log-format');
			assert.isObject(morgan.firstCall.args[1]);
			assert.isFunction(morgan.firstCall.args[1].skip);
			assert.calledWithExactly(express.mockApp.use, morgan.mockMiddleware);
		});

		describe('Morgan `skip` option function', () => {
			let app;
			let skip;

			beforeEach(() => {
				skip = morgan.firstCall.args[1].skip;
				app = skip(express.mockRequest);
			});

			it('returns `false`', () => {
				assert.isFalse(app);
			});

			describe('when `request.path` is `"/favicon.ico"`', () => {

				beforeEach(() => {
					express.mockRequest.path = '/favicon.ico';
					app = skip(express.mockRequest);
				});

				it('returns `true`', () => {
					assert.isTrue(app);
				});

			});

		});

		it('creates and mounts Express static middleware', () => {
			assert.calledOnce(express.static);
			assert.calledWithExactly(express.static, 'mock-base-path/public', {
				maxAge: 0
			});
			assert.calledWithExactly(express.mockApp.use, express.mockStaticMiddleware);
		});

		it('logs that the application has been configured', () => {
			assert.calledWith(log.info, 'Test App configured (graphite=true logging=true sentry=true)');
		});

		it('stores additional data in the `app.origami` object', () => {
			assert.isObject(express.mockApp.origami);
		});

		it('stores the defaulted options in `app.origami.options`', () => {
			assert.strictEqual(express.mockApp.origami.options, defaults.firstCall.returnValue);
		});

		it('stores useful application paths in `app.origami.paths`', () => {
			assert.deepEqual(express.mockApp.origami.paths, {
				base: 'mock-base-path',
				manifest: 'mock-base-path/package.json',
				public: 'mock-base-path/public',
				views: 'mock-base-path/views',
				layouts: 'mock-base-path/views/layouts',
				partials: 'mock-base-path/views/partials'
			});
		});

		it('stores the logger in `app.origami.log`', () => {
			assert.strictEqual(express.mockApp.origami.log.info, options.log.info);
		});

		it('stores the Next Metrics instance in `app.origami.metrics`', () => {
			assert.strictEqual(express.mockApp.origami.metrics, nextMetrics.mockInstance);
		});

		it('stores a copy of `app.origami` in `app.locals.origami`', () => {
			assert.strictEqual(express.mockApp.origami, express.mockApp.locals.origami);
		});

		it('returns the created Express application', () => {
			assert.strictEqual(app, express.mockApp);
		});

		describe('when `options.about.schemaVersion` is not set', () => {

			beforeEach(() => {
				delete options.about.schemaVersion;
				app = origamiService(options);
			});

			it('sets the schema version to 1', () => {
				assert.strictEqual(app.origami.options.about.schemaVersion, 1);
			});

		});

		describe('when `options.about.name` is not set', () => {

			beforeEach(() => {
				delete options.about.name;
				app = origamiService(options);
			});

			it('sets the name to the manifest name', () => {
				assert.strictEqual(app.origami.options.about.name, manifest.name);
			});

		});

		describe('when `options.about.name` and `manifest.name` are not set', () => {

			beforeEach(() => {
				delete options.about.name;
				delete manifest.name;
				app = origamiService(options);
			});

			it('sets the name to a default', () => {
				assert.strictEqual(app.origami.options.about.name, 'Origami Service');
			});

		});

		describe('when `options.about.purpose` is not set', () => {

			beforeEach(() => {
				delete options.about.purpose;
				app = origamiService(options);
			});

			it('sets the purpose to the manifest description', () => {
				assert.strictEqual(app.origami.options.about.purpose, manifest.description);
			});

		});

		describe('when `options.about.purpose` and `manifest.description` are not set', () => {

			beforeEach(() => {
				delete options.about.purpose;
				delete manifest.description;
				app = origamiService(options);
			});

			it('sets the purpose to a default', () => {
				assert.strictEqual(app.origami.options.about.purpose, 'An Origami web service.');
			});

		});

		describe('when `options.exposeErrorEndpoint` is truthy', () => {

			beforeEach(() => {
				expressWebService.reset();
				options.exposeErrorEndpoint = true;
				app = origamiService(options);
			});

			it('creates and mounts Express Web Service middleware with an error endpoint', () => {
				assert.deepEqual(expressWebService.firstCall.args[0].routes, [
					'about',
					'gtg',
					'health',
					'error'
				]);
			});

		});

		describe('when `options.metricsAppName` is not set', () => {

			beforeEach(() => {
				delete options.metricsAppName;
				nextMetrics.mockInstance.init.reset();
				app = origamiService(options);
			});

			it('uses `options.about.systemCode` as the app name in Next Metrics', () => {
				assert.calledOnce(nextMetrics.mockInstance.init);
				assert.strictEqual(nextMetrics.mockInstance.init.firstCall.args[0].app, options.about.systemCode);
			});

		});

		describe('when `options.metricsAppName` and `options.about.systemCode` are not set', () => {

			beforeEach(() => {
				delete options.metricsAppName;
				delete options.about.systemCode;
				nextMetrics.mockInstance.init.reset();
				app = origamiService(options);
			});

			it('uses `options.about.name` as the app name in Next Metrics', () => {
				assert.calledOnce(nextMetrics.mockInstance.init);
				assert.strictEqual(nextMetrics.mockInstance.init.firstCall.args[0].app, options.about.name);
			});

		});

		describe('when `options.environment` is set to "production"', () => {

			beforeEach(() => {
				express.static.reset();
				options.environment = 'production';
				app = origamiService(options);
			});

			it('creates and mounts Express static middleware with a week long max-age', () => {
				assert.calledOnce(express.static);
				assert.calledWithExactly(express.static, 'mock-base-path/public', {
					maxAge: 604800000
				});
			});

		});

		describe('when `options.graphiteApiKey` is set to `null`', () => {

			beforeEach(() => {
				nextMetrics.Metrics.reset();
				nextMetrics.mockInstance.init.reset();
				options.graphiteApiKey = null;
				app = origamiService(options);
			});

			it('does not create or initialise Next Metrics', () => {
				assert.notCalled(nextMetrics.Metrics);
				assert.notCalled(nextMetrics.mockInstance.init);
			});

			it('stores a mock instance in `app.origami.metrics`', () => {
				assert.isObject(express.mockApp.origami.metrics);
				assert.isFunction(express.mockApp.origami.metrics.count);
			});

			it('warns that metrics are not set up', () => {
				assert.called(options.log.warn);
				assert.calledWith(options.log.warn, 'Warning: metrics are not being recorded for this application. Please provide a GRAPHITE_API_KEY environment variable');
			});

		});

		describe('when `options.requestLogFormat` is set to `null`', () => {

			beforeEach(() => {
				morgan.reset();
				express.mockApp.use.reset();
				options.requestLogFormat = null;
				app = origamiService(options);
			});

			it('does not create and mount Morgan middleware', () => {
				assert.notCalled(morgan);
				assert.neverCalledWith(express.mockApp.use, morgan.mockMiddleware);
			});

		});

		describe('when `options.sentryDsn` is not defined', () => {

			beforeEach(() => {
				raven.config.reset();
				raven.install.reset();
				raven.requestHandler.reset();
				express.mockApp.use.reset();
				delete process.env.SENTRY_DSN;
				delete options.sentryDsn;
				app = origamiService(options);
			});

			it('does not configure and install Raven', () => {
				assert.notCalled(raven.config);
				assert.notCalled(raven.install);
			});

			it('does not create and mount Raven request handler middleware', () => {
				assert.notCalled(raven.requestHandler);
				assert.neverCalledWith(express.mockApp.use, raven.mockRequestMiddleware);
			});

			it('warns that Sentry is not set up', () => {
				assert.called(options.log.warn);
				assert.calledWith(options.log.warn, 'Warning: errors are not being logged to Sentry for this application. Please provide a SENTRY_DSN environment variable');
			});

		});

		describe('.listen()', () => {
			let returnedPromise;

			beforeEach(() => {
				returnedPromise = app.listen();
			});

			it('returns a promise', () => {
				assert.instanceOf(returnedPromise, Promise);
			});

			it('stores the original `app.listen` as `app._originalListen`', () => {
				assert.isFunction(express.mockApp._originalListen);
			});

			it('Calls the original `app.listen` with `options.port`', () => {
				assert.calledOnce(express.mockApp._originalListen);
				assert.calledWith(express.mockApp._originalListen, options.port);
			});

			describe('.then()', () => {
				let resolvedValue;

				beforeEach(() => {
					return returnedPromise.then(value => {
						resolvedValue = value;
					});
				});

				it('resolves with the Express application', () => {
					assert.strictEqual(resolvedValue, app);
				});

				it('stores the created server in `app.origami.server`', () => {
					assert.strictEqual(app.origami.server, express.mockServer);
				});

				it('logs that the application has started', () => {
					assert.calledWith(log.info, 'Test App started (env=test port=1234)');
				});

			});

			describe('when the Express application errors on startup', () => {
				let expressError;

				beforeEach(() => {
					options.log.info.reset();
					options.log.error.reset();
					expressError = new Error('Express failed to start');
					express.mockApp._originalListen.yieldsAsync(expressError);
				});

				describe('.catch()', () => {
					let caughtError;

					beforeEach(() => {
						return app.listen().catch(error => {
							caughtError = error;
						});
					});

					it('rejects with the Express error', () => {
						assert.strictEqual(caughtError, expressError);
					});

					it('does not log that the application has started', () => {
						assert.neverCalledWith(log.info, 'Test App started (env=test port=1234)');
					});

					it('logs that the application has errored', () => {
						assert.calledWith(log.error, `Test App startup error (${expressError.message})`);
					});

				});

			});

		});

	});

});
