'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/middleware/error-handler', () => {
	let express;
	let errorHandler;
	let log;
	let raven;

	beforeEach(() => {
		express = require('../../mock/express.mock');

		log = require('../../mock/log.mock');

		raven = require('../../mock/raven.mock');
		mockery.registerMock('raven', raven);

		errorHandler = require('../../../../lib/middleware/error-handler');
	});

	it('exports a function', () => {
		assert.isFunction(errorHandler);
	});

	describe('errorHandler()', () => {
		let middleware;

		beforeEach(() => {
			middleware = errorHandler();
		});

		it('returns a middleware function', () => {
			assert.isFunction(middleware);
		});

		describe('middleware(error, request, response, next)', () => {
			let error;
			let next;

			beforeEach(() => {
				express.mockRequest.app.origami = {
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

			it('creates a Raven error handler middleware', () => {
				assert.calledOnce(raven.errorHandler);
			});

			it('calls the Raven error handler middleware with the expected arguments', () => {
				assert.calledOnce(raven.mockErrorMiddleware);
				assert.calledWith(raven.mockErrorMiddleware, error, express.mockRequest, express.mockResponse);
			});

			it('logs the error', () => {
				assert.calledWithExactly(log.error, 'Error: Oops');
			});

			it('sends an error status code', () => {
				assert.calledOnce(express.mockResponse.status);
				assert.calledWithExactly(express.mockResponse.status, 500);
			});

			it('responds with an HTML representation of the error', () => {
				assert.calledOnce(express.mockResponse.send);
				const sentData = express.mockResponse.send.firstCall.args[0];
				assert.match(sentData, /<h1>Error 500<\/h1>/);
				assert.match(sentData, /<p>Oops<\/p>/);
				assert.include(sentData, error.stack);
			});

			describe('when `request.app.origami.options.sentryDsn` is not defined', () => {

				beforeEach(() => {
					express.mockResponse.status.reset();
					express.mockResponse.send.reset();
					raven.mockErrorMiddleware.reset();
					delete express.mockRequest.app.origami.options.sentryDsn;
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('does not call the Raven error handler middleware', () => {
					assert.notCalled(raven.mockErrorMiddleware);
				});

				it('sends an error status code', () => {
					assert.calledOnce(express.mockResponse.status);
					assert.calledWithExactly(express.mockResponse.status, 500);
				});

				it('responds with an HTML representation of the error', () => {
					assert.calledOnce(express.mockResponse.send);
					const sentData = express.mockResponse.send.firstCall.args[0];
					assert.match(sentData, /<h1>Error 500<\/h1>/);
					assert.match(sentData, /<p>Oops<\/p>/);
					assert.include(sentData, error.stack);
				});

			});

			describe('when `request.app.origami.options.environment` is "production"', () => {

				beforeEach(() => {
					express.mockResponse.send.reset();
					express.mockRequest.app.origami.options.environment = 'production';
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('does not include the stack in the HTML representation of the error', () => {
					assert.calledOnce(express.mockResponse.send);
					const sentData = express.mockResponse.send.firstCall.args[0];
					assert.notInclude(sentData, error.stack);
				});

			});

			describe('when `error.status` is set', () => {

				beforeEach(() => {
					error.status = 567;
					express.mockResponse.status.reset();
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
					express.mockResponse.status.reset();
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
					express.mockResponse.status.reset();
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
					log.error.reset();
					express.mockResponse.send.reset();
					middleware(error, express.mockRequest, express.mockResponse, next);
				});

				it('does not log the error', () => {
					assert.neverCalledWith(log.error, 'Error: Oops');
				});

				it('does not include the stack in the HTML representation of the error', () => {
					const sentData = express.mockResponse.send.firstCall.args[0];
					assert.notInclude(sentData, error.stack);
				});

			});

		});

	});

});
