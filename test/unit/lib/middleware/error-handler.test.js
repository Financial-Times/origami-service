'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/middleware/error-handler', () => {
	let cacheControl;
	let defaults;
	let express;
	let errorHandler;
	let log;
	let mockCacheControlMiddleware;
	let raven;

	beforeEach(() => {
		mockCacheControlMiddleware = sinon.stub();
		cacheControl = sinon.stub().returns(mockCacheControlMiddleware);
		mockery.registerMock('./cache-control', cacheControl);

		defaults = sinon.spy(require('lodash/defaults'));
		mockery.registerMock('lodash/defaults', defaults);

		express = require('../../mock/express.mock');

		log = require('../../mock/log.mock');

		raven = require('../../mock/raven.mock');
		mockery.registerMock('raven', raven);

		errorHandler = require('../../../../lib/middleware/error-handler');
	});

	it('exports a function', () => {
		assert.isFunction(errorHandler);
	});

	it('has a `defaults` property', () => {
		assert.isObject(errorHandler.defaults);
	});

	describe('.defaults', () => {

		it('has an `outputJson` property', () => {
			assert.isFalse(errorHandler.defaults.outputJson);
		});

	});

	describe('errorHandler(options)', () => {
		let middleware;
		let options;

		beforeEach(() => {
			options = {
				mockOption: true
			};
			middleware = errorHandler(options);
		});

		it('defaults the passed in options', () => {
			assert.isObject(defaults.firstCall.args[0]);
			assert.strictEqual(defaults.firstCall.args[1], options);
			assert.strictEqual(defaults.firstCall.args[2], errorHandler.defaults);
		});

		it('returns a middleware function', () => {
			assert.isFunction(middleware);
		});

		describe('middleware(error, request, response, next)', () => {
			let error;
			let next;

			beforeEach(() => {
				express.mockRequest.url = 'mock-url';
				express.mockRequest.app.ft = {
					log,
					options: {
						sentryDsn: 'mock-sentry-dsn'
					}
				};
				error = new Error('Oops');
				next = sinon.spy();
				raven.mockErrorMiddleware.yields(error);
				express.mockResponse.render.yields(null, 'mock-html');
				middleware(error, express.mockRequest, express.mockResponse, next);
			});

			it('creates a Raven error handler middleware', () => {
				assert.calledOnce(raven.errorHandler);
			});

			it('calls the Raven error handler middleware with the expected arguments', () => {
				assert.calledOnce(raven.mockErrorMiddleware);
				assert.calledWith(raven.mockErrorMiddleware, error, express.mockRequest, express.mockResponse);
			});

			it('does not log the error', () => {
				assert.notCalled(log.error);
			});

			it('creates a cacheControl middleware', () => {
				assert.calledOnce(cacheControl);
				assert.calledWith(cacheControl, {
					maxAge: 0,
					staleIfError: 0
				});
			});

			it('calls the cacheControl middleware with the request and response', () => {
				assert.calledOnce(mockCacheControlMiddleware);
				assert.calledWithExactly(mockCacheControlMiddleware, express.mockRequest, express.mockResponse);
			});

			it('sends an error status code', () => {
				assert.calledOnce(express.mockResponse.status);
				assert.calledWithExactly(express.mockResponse.status, 500);
			});

			it('renders an error page with the expected context', () => {
				assert.calledOnce(express.mockResponse.render);
				assert.calledWith(express.mockResponse.render, 'error', {
					title: 'Error 500',
					error: {
						status: 500,
						message: error.message,
						stack: error.stack
					}
				});
			});

			it('responds with the rendered error page', () => {
				assert.calledOnce(express.mockResponse.send);
				assert.calledWithExactly(express.mockResponse.send, 'mock-html');
			});

			describe('when `request.app.ft.options.sentryDsn` is not defined', () => {

				beforeEach(() => {
					express.mockResponse.status.resetHistory();
					express.mockResponse.send.resetHistory();
					raven.mockErrorMiddleware.reset();
					delete express.mockRequest.app.ft.options.sentryDsn;
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('does not call the Raven error handler middleware', () => {
					assert.notCalled(raven.mockErrorMiddleware);
				});

			});

			describe('when `error.skipSentry` is set', () => {

				beforeEach(() => {
					express.mockResponse.status.resetHistory();
					express.mockResponse.send.resetHistory();
					raven.mockErrorMiddleware.reset();
					error.skipSentry = true;
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('does not call the Raven error handler middleware', () => {
					assert.notCalled(raven.mockErrorMiddleware);
				});

			});

			describe('when `request.app.ft.options.environment` is "production"', () => {

				beforeEach(() => {
					express.mockResponse.render.reset();
					express.mockRequest.app.ft.options.environment = 'production';
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('does not include the stack when rendering the error', () => {
					assert.calledOnce(express.mockResponse.render);
					assert.calledWith(express.mockResponse.render, 'error', {
						title: 'Error 500',
						error: {
							status: 500,
							message: error.message,
							stack: undefined
						}
					});
				});

			});

			describe('when `error.status` is set', () => {

				beforeEach(() => {
					error.status = 567;
					express.mockResponse.status.resetHistory();
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('sends the given status code to the user', () => {
					assert.calledOnce(express.mockResponse.status);
					assert.calledWithExactly(express.mockResponse.status, 567);
				});

			});

			describe('when `error.statusCode` is set', () => {

				beforeEach(() => {
					error.statusCode = 567;
					express.mockResponse.status.resetHistory();
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('sends the given status code to the user', () => {
					assert.calledOnce(express.mockResponse.status);
					assert.calledWithExactly(express.mockResponse.status, 567);
				});

			});

			describe('when `error.status_code` is set', () => {

				beforeEach(() => {
					error.status_code = 567;
					express.mockResponse.status.resetHistory();
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('sends the given status code to the user', () => {
					assert.calledOnce(express.mockResponse.status);
					assert.calledWithExactly(express.mockResponse.status, 567);
				});

			});

			describe('when the error status is below 500', () => {

				beforeEach(() => {
					error.status = 499;
					delete error.stack;
					log.error.reset();
					express.mockResponse.render.reset();
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('does not log the error', () => {
					assert.neverCalledWith(log.error, 'Server Error message="Oops" status=499 stack=null url="mock-url"');
				});

				it('does not include the stack when rendering the error', () => {
					assert.calledOnce(express.mockResponse.render);
					assert.calledWith(express.mockResponse.render, 'error', {
						title: 'Error 499',
						error: {
							status: 499,
							message: error.message,
							stack: undefined
						}
					});
				});

			});

			describe('when `error.stack` is not defined', () => {

				beforeEach(() => {
					log.error.reset();
					express.mockResponse.render.reset();
					delete error.stack;
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('does not log the error', () => {
					assert.notCalled(log.error);
				});

			});

			describe('when the error `cacheMaxAge` property is set', () => {

				beforeEach(() => {
					error.cacheMaxAge = '1d';
					cacheControl.resetHistory();
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('creates a cacheControl middleware with the given max age', () => {
					assert.calledOnce(cacheControl);
					assert.calledWith(cacheControl, {
						maxAge: '1d',
						staleIfError: 0
					});
				});

			});

			describe('when the error template fails to render', () => {
				let renderError;

				beforeEach(() => {
					renderError = new Error('render-error');
					express.mockResponse.render.yields(renderError);
					express.mockResponse.send.resetHistory();
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('responds with a basic HTML representation of the error', () => {
					assert.calledOnce(express.mockResponse.send);
					const html = express.mockResponse.send.firstCall.args[0];
					assert.match(html, /<h1>Error 500<\/h1>/);
					assert.match(html, /<p>Oops<\/p>/);
					assert.include(html, error.stack);
					assert.include(html, renderError.stack);
				});

				describe('when the error stack would not normally be shown', () => {

					beforeEach(() => {
						error.status = 400;
						express.mockResponse.send.resetHistory();
						middleware(error, express.mockRequest, express.mockResponse, next);
					});

					it('does not include the stack in the HTML output', () => {
						assert.calledOnce(express.mockResponse.send);
						const html = express.mockResponse.send.firstCall.args[0];
						assert.notInclude(html, error.stack);
						assert.notInclude(html, renderError.stack);
					});

				});

			});

		});

		describe('when `options.outputJson` is `true`', () => {

			beforeEach(() => {
				options = {
					outputJson: true
				};
				middleware = errorHandler(options);
			});

			describe('middleware(error, request, response, next)', () => {
				let error;
				let next;

				beforeEach(() => {
					express.mockRequest.url = 'mock-url';
					express.mockRequest.app.ft = {
						log,
						options: {
							sentryDsn: 'mock-sentry-dsn'
						}
					};
					error = new Error('Oops');
					next = sinon.spy();
					raven.mockErrorMiddleware.yields(error);
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('responds with the error details as JSON', () => {
					assert.calledOnce(express.mockResponse.send);
					assert.calledWithExactly(express.mockResponse.send, {
						status: 500,
						message: error.message,
						stack: error.stack
					});
				});

				it('does not render an error page', () => {
					assert.notCalled(express.mockResponse.render);
				});

			});

		});

	});

});
