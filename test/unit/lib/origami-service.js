'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/origami-service', () => {
	let express;
	let defaults;
	let morgan;
	let notFound;
	let origamiService;

	beforeEach(() => {
		express = require('../mock/express.mock');
		mockery.registerMock('express', express);

		defaults = sinon.spy(require('lodash/defaultsDeep'));
		mockery.registerMock('lodash/defaultsDeep', defaults);

		morgan = require('../mock/morgan.mock');
		mockery.registerMock('morgan', morgan);

		notFound = sinon.stub();
		mockery.registerMock('./middleware/not-found', notFound);

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

		it('has an `environment` property', () => {
			assert.strictEqual(origamiService.defaults.environment, 'development');
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

		it('has a `start` property', () => {
			assert.strictEqual(origamiService.defaults.start, true);
		});

	});

	it('has a `middleware` property', () => {
		assert.isObject(origamiService.middleware);
	});

	describe('.middleware', () => {

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
			options = {
				basePath: 'mock-base-path',
				environment: 'test',
				port: 1234,
				region: 'US',
				requestLogFormat: 'mock-log-format'
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
				region: process.env.REGION
			});
			assert.strictEqual(defaults.firstCall.args[3], origamiService.defaults);
		});

		it('creates an Express application', () => {
			assert.calledOnce(express);
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
				public: 'mock-base-path/public'
			});
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

		describe('when `options.start` is set to `false`', () => {

			beforeEach(() => {
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

			});

		});

		describe('when the Express application errors on startup', () => {
			let expressError;

			beforeEach(() => {
				expressError = new Error('Express failed to start');
				express.mockApp.listen.yieldsAsync(expressError);
			});

			describe('.catch()', () => {
				let caughtError;

				beforeEach(() => {
					return origamiService().catch(error => {
						caughtError = error;
					});
				});

				it('rejects with the Express error', () => {
					assert.strictEqual(caughtError, expressError);
				});

			});

		});

	});

});
