'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/origami-service', () => {
	let cacheControl;
	let defaults;
	let errorHandler;
	let express;
	let expressHandlebars;
	let getBasePath;
	let log;
	let morgan;
	let notFound;
	let origamiService;
	let raven;

	beforeEach(() => {
		cacheControl = sinon.stub();
		mockery.registerMock('./middleware/cache-control', cacheControl);

		defaults = sinon.spy(require('lodash/defaults'));
		mockery.registerMock('lodash/defaults', defaults);

		errorHandler = sinon.stub();
		mockery.registerMock('./middleware/error-handler', errorHandler);

		express = require('../mock/express.mock');
		mockery.registerMock('express', express);

		expressHandlebars = require('../mock/express-handlebars.mock');
		mockery.registerMock('express-handlebars', expressHandlebars);

		getBasePath = sinon.stub();
		mockery.registerMock('./middleware/get-base-path', getBasePath);

		log = require('../mock/log.mock');
		mockery.registerMock('log', log);

		morgan = require('../mock/morgan.mock');
		mockery.registerMock('morgan', morgan);

		notFound = sinon.stub();
		mockery.registerMock('./middleware/not-found', notFound);

		raven = require('../mock/raven.mock');
		mockery.registerMock('raven', raven);

		origamiService = require('../../..');
	});

	it('exports a function', () => {
		assert.isFunction(origamiService);
	});

	it('has a `defaults` property', () => {
		assert.isObject(origamiService.defaults);
	});

	describe('.defaults', () => {

		it('has a `basePath` property', () => {
			assert.strictEqual(origamiService.defaults.basePath, process.cwd());
		});

		it('has an `defaultLayout` property', () => {
			assert.strictEqual(origamiService.defaults.defaultLayout, false);
		});

		it('has an `environment` property', () => {
			assert.strictEqual(origamiService.defaults.environment, 'development');
		});

		it('has a `log` property', () => {
			assert.strictEqual(origamiService.defaults.log, console);
		});

		it('has a `name` property', () => {
			assert.strictEqual(origamiService.defaults.name, 'Origami Service');
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

		it('has a `start` property', () => {
			assert.strictEqual(origamiService.defaults.start, true);
		});

	});

	it('has a `middleware` property', () => {
		assert.isObject(origamiService.middleware);
	});

	describe('.middleware', () => {

		it('has a `cacheControl` property which references `lib/middleware/cache-control`', () => {
			assert.strictEqual(origamiService.middleware.cacheControl, cacheControl);
		});

		it('has an `errorHandler` property which references `lib/middleware/error-handler`', () => {
			assert.strictEqual(origamiService.middleware.errorHandler, errorHandler);
		});

		it('has a `getBasePath` property which references `lib/middleware/get-base-path`', () => {
			assert.strictEqual(origamiService.middleware.getBasePath, getBasePath);
		});

		it('has a `notFound` property which references `lib/middleware/not-found`', () => {
			assert.strictEqual(origamiService.middleware.notFound, notFound);
		});

	});

	describe('origamiService(options)', () => {
		let options;
		let returnedPromise;

		beforeEach(() => {

			// Define options in the environment and
			// as an object (which takes priority)
			process.env.PORT = 5678;
			process.env.REGION = 'The Moon';
			process.env.NODE_ENV = 'production';
			process.env.RAVEN_URL = 'env-raven-url';
			process.env.SENTRY_DSN = 'env-sentry-dsn';
			options = {
				basePath: 'mock-base-path',
				defaultLayout: 'mock-default-layout',
				environment: 'test',
				log: log,
				name: 'Test App',
				port: 1234,
				region: 'US',
				requestLogFormat: 'mock-log-format',
				sentryDsn: 'mock-sentry-dsn'
			};

			returnedPromise = origamiService(options);
		});

		it('returns a promise', () => {
			assert.instanceOf(returnedPromise, Promise);
		});

		it('defaults the passed in options', () => {
			assert.isObject(defaults.firstCall.args[0]);
			assert.strictEqual(defaults.firstCall.args[1], options);
			assert.deepEqual(defaults.firstCall.args[2], {
				environment: process.env.NODE_ENV,
				port: process.env.PORT,
				region: process.env.REGION,
				sentryDsn: process.env.SENTRY_DSN
			});
			assert.strictEqual(defaults.firstCall.args[3], origamiService.defaults);
		});

		it('creates an Express application', () => {
			assert.calledOnce(express);
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

		it('configures and installs Raven', () => {
			assert.calledOnce(raven.config);
			assert.calledOnce(raven.install);
			assert.calledWithExactly(raven.config, options.sentryDsn);
		});

		it('creates and mounts Raven request handler middleware', () => {
			assert.calledOnce(raven.requestHandler);
			assert.calledWithExactly(express.mockApp.use, raven.mockRequestMiddleware);
		});

		it('creates and mounts Morgan middleware', () => {
			assert.calledOnce(morgan);
			assert.calledWith(morgan, 'mock-log-format');
			assert.isObject(morgan.firstCall.args[1]);
			assert.isFunction(morgan.firstCall.args[1].skip);
			assert.calledWithExactly(express.mockApp.use, morgan.mockMiddleware);
		});

		describe('Morgan `skip` option function', () => {
			let returnedValue;
			let skip;

			beforeEach(() => {
				skip = morgan.firstCall.args[1].skip;
				returnedValue = skip(express.mockRequest);
			});

			it('returns `false`', () => {
				assert.isFalse(returnedValue);
			});

			describe('when `request.path` is `"/favicon.ico"`', () => {

				beforeEach(() => {
					express.mockRequest.path = '/favicon.ico';
					returnedValue = skip(express.mockRequest);
				});

				it('returns `true`', () => {
					assert.isTrue(returnedValue);
				});

			});

			describe('when the last part of `request.path` begins with a double underscore', () => {

				beforeEach(() => {
					express.mockRequest.path = '/foo/bar/__health';
					returnedValue = skip(express.mockRequest);
				});

				it('returns `true`', () => {
					assert.isTrue(returnedValue);
				});

			});

			describe('when the first part of `request.path` begins with a double underscore', () => {

				beforeEach(() => {
					express.mockRequest.path = '/__origami/foo/bar/';
					returnedValue = skip(express.mockRequest);
				});

				it('returns `false`', () => {
					assert.isFalse(returnedValue);
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

		it('stores additional data in the `app.origami` object', () => {
			assert.isObject(express.mockApp.origami);
		});

		it('stores the defaulted options in `app.origami.options`', () => {
			assert.strictEqual(express.mockApp.origami.options, defaults.firstCall.returnValue);
		});

		it('stores useful application paths in `app.origami.paths`', () => {
			assert.deepEqual(express.mockApp.origami.paths, {
				base: 'mock-base-path',
				public: 'mock-base-path/public',
				views: 'mock-base-path/views',
				layouts: 'mock-base-path/views/layouts',
				partials: 'mock-base-path/views/partials'
			});
		});

		it('stores the logger in `app.origami.log`', () => {
			assert.strictEqual(express.mockApp.origami.log.info, options.log.info);
		});

		it('stores a copy of `app.origami` in `app.locals.origami`', () => {
			assert.strictEqual(express.mockApp.origami, express.mockApp.locals.origami);
		});

		describe('.then()', () => {
			let app;

			beforeEach(() => {
				return returnedPromise.then(value => {
					app = value;
				});
			});

			it('resolves with the created Express application', () => {
				assert.strictEqual(app, express.mockApp);
			});

			it('stores the created server in `app.origami.server`', () => {
				assert.strictEqual(app.origami.server, express.mockServer);
			});

			it('logs that the application has started', () => {
				assert.calledWith(log.info, 'Test App started (env=test port=1234)');
			});

		});

		describe('when `options.environment` is set to "production"', () => {

			beforeEach(() => {
				express.static.reset();
				options.environment = 'production';
				returnedPromise = origamiService(options);
			});

			it('creates and mounts Express static middleware with a week long max-age', () => {
				assert.calledOnce(express.static);
				assert.calledWithExactly(express.static, 'mock-base-path/public', {
					maxAge: 604800000
				});
			});

		});

		describe('when `options.requestLogFormat` is set to `null`', () => {

			beforeEach(() => {
				morgan.reset();
				express.mockApp.use.reset();
				options.requestLogFormat = null;
				returnedPromise = origamiService(options);
			});

			it('does not create and mount Morgan middleware', () => {
				assert.notCalled(morgan);
				assert.neverCalledWith(express.mockApp.use, morgan.mockMiddleware);
			});

		});

		describe('when the `RAVEN_URL` environment variable is set and `SENTRY_DSN` is not', () => {

			beforeEach(() => {
				defaults.reset();
				delete process.env.SENTRY_DSN;
				returnedPromise = origamiService(options);
			});

			it('uses `RAVEN_URL` as a provider for the `sentryDsn` option', () => {
				assert.deepEqual(defaults.firstCall.args[2].sentryDsn, process.env.RAVEN_URL);
			});

		});

		describe('when `options.sentryDsn` is not defined', () => {

			beforeEach(() => {
				raven.config.reset();
				raven.install.reset();
				raven.requestHandler.reset();
				express.mockApp.use.reset();
				delete process.env.SENTRY_DSN;
				delete process.env.RAVEN_URL;
				delete options.sentryDsn;
				returnedPromise = origamiService(options);
			});

			it('does not configure and install Raven', () => {
				assert.notCalled(raven.config);
				assert.notCalled(raven.install);
			});

			it('creates and mounts Raven request handler middleware', () => {
				assert.notCalled(raven.requestHandler);
				assert.neverCalledWith(express.mockApp.use, raven.mockRequestMiddleware);
			});

		});

		describe('when `options.start` is set to `false`', () => {

			beforeEach(() => {
				log.info.reset();
				express.mockApp.listen.reset();
				options.start = false;
				returnedPromise = origamiService(options);
			});

			describe('.then()', () => {
				let app;

				beforeEach(() => {
					return returnedPromise.then(value => {
						app = value;
					});
				});

				it('does not start the Express application', () => {
					assert.notCalled(express.mockApp.listen);
				});

				it('resolves with the created Express application', () => {
					assert.strictEqual(app, express.mockApp);
				});

				it('does not log that the application has started', () => {
					assert.neverCalledWith(log.info, 'Test App started (env=test port=1234)');
				});

			});

		});

		describe('when the Express application errors on startup', () => {
			let expressError;

			beforeEach(() => {
				options.log.info.reset();
				options.log.error.reset();
				expressError = new Error('Express failed to start');
				express.mockApp.listen.yieldsAsync(expressError);
			});

			describe('.catch()', () => {
				let caughtError;

				beforeEach(() => {
					return origamiService(options).catch(error => {
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
