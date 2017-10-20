'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/middleware/purge-urls', () => {
	let defaults;
	let express;
	let httpError;
	let httpRequest;
	let log;
	let purgeUrls;

	beforeEach(() => {
		defaults = sinon.spy(require('lodash/defaults'));
		mockery.registerMock('lodash/defaults', defaults);

		express = require('../../mock/express.mock');

		httpError = require('../../mock/http-errors.mock');
		mockery.registerMock('http-errors', httpError);

		httpRequest = require('../../mock/request-promise-native.mock');
		mockery.registerMock('request-promise-native', httpRequest);

		log = require('../../mock/log.mock');

		purgeUrls = require('../../../../lib/middleware/purge-urls');
	});

	it('exports a function', () => {
		assert.isFunction(purgeUrls);
	});

	it('has a `defaults` property', () => {
		assert.isObject(purgeUrls.defaults);
	});

	describe('.defaults', () => {

		it('has a `urls` property', () => {
			assert.isArray(purgeUrls.defaults.urls);
			assert.deepEqual(purgeUrls.defaults.urls, []);
		});

	});

	describe('purgeUrls(options)', () => {
		let options;
		let middleware;

		beforeEach(() => {

			// Define options in the environment and
			// as an object (which takes priority)
			process.env.FASTLY_PURGE_API_KEY = 'env-fastly-key';
			process.env.PURGE_API_KEY = 'env-purge-key';
			options = {
				fastlyApiKey: 'mock-fastly-key',
				purgeApiKey: 'mock-purge-key',
				urls: [
					'https://mock-url/1',
					'https://mock-url/2',
					'https://mock-url/3'
				]
			};

			middleware = purgeUrls(options);
		});

		it('defaults the passed in options', () => {
			assert.isObject(defaults.firstCall.args[0]);
			assert.strictEqual(defaults.firstCall.args[1], options);
			assert.deepEqual(defaults.firstCall.args[2], {
				fastlyApiKey: process.env.FASTLY_PURGE_API_KEY,
				purgeApiKey: process.env.PURGE_API_KEY
			});
			assert.strictEqual(defaults.firstCall.args[3], purgeUrls.defaults);
		});

		it('returns a middleware function', () => {
			assert.isFunction(middleware);
		});

		describe('middleware(request, response, next)', () => {
			let next;
			let mockHttpResponse;

			beforeEach(() => {
				mockHttpResponse = {
					statusCode: 200
				};
				httpRequest.resolves(mockHttpResponse);
				express.mockRequest.query.apiKey = 'mock-purge-key';
				express.mockApp.ft = {log};
				next = sinon.spy();
				return middleware(express.mockRequest, express.mockResponse, next);
			});

			it('makes a PURGE request for each URL', () => {
				assert.calledThrice(httpRequest);

				assert.deepEqual(httpRequest.firstCall.args[0], {
					uri: 'https://mock-url/1',
					method: 'PURGE',
					headers: {
						'Fastly-Key': 'mock-fastly-key',
						'Fastly-Soft-Purge': 1
					},
					simple: false,
					resolveWithFullResponse: true
				});

				assert.deepEqual(httpRequest.secondCall.args[0], {
					uri: 'https://mock-url/2',
					method: 'PURGE',
					headers: {
						'Fastly-Key': 'mock-fastly-key',
						'Fastly-Soft-Purge': 1
					},
					simple: false,
					resolveWithFullResponse: true
				});

				assert.deepEqual(httpRequest.thirdCall.args[0], {
					uri: 'https://mock-url/3',
					method: 'PURGE',
					headers: {
						'Fastly-Key': 'mock-fastly-key',
						'Fastly-Soft-Purge': 1
					},
					simple: false,
					resolveWithFullResponse: true
				});
			});

			it('logs that each URL has been purged', () => {
				assert.calledWithExactly(log.info, 'Purged URL from Fastly: https://mock-url/1');
				assert.calledWithExactly(log.info, 'Purged URL from Fastly: https://mock-url/2');
				assert.calledWithExactly(log.info, 'Purged URL from Fastly: https://mock-url/3');
				assert.calledWithExactly(log.info, 'Purged URLs successfully');
			});

			it('responds with a 202 status', () => {
				assert.calledOnce(express.mockResponse.status);
				assert.calledWithExactly(express.mockResponse.status, 202);
			});

			it('responds with "Purging URLs"', () => {
				assert.calledOnce(express.mockResponse.send);
				assert.calledWithExactly(express.mockResponse.send, 'Purging URLs');
			});

			it('does not call `next`', () => {
				assert.notCalled(next);
			});

			describe('when `request` has a `wait` query parameter', () => {

				beforeEach(() => {
					express.mockResponse.status.resetHistory();
					express.mockResponse.send.resetHistory();
					express.mockRequest.query.wait = '1000';
					sinon.stub(global, 'setTimeout').yieldsAsync();
					return middleware(express.mockRequest, express.mockResponse, next);
				});

				afterEach(() => {
					global.setTimeout.restore();
				});

				it('sets a timeout before requesting the URLs', () => {
					assert.calledOnce(setTimeout);
					assert.strictEqual(setTimeout.firstCall.args[1], express.mockRequest.query.wait);
				});

			});

			describe('when `request` does not have an `apiKey` query parameter', () => {

				beforeEach(() => {
					express.mockResponse.status.resetHistory();
					express.mockResponse.send.resetHistory();
					delete express.mockRequest.query.apiKey;
					return middleware(express.mockRequest, express.mockResponse, next);
				});

				it('does not respond', () => {
					assert.notCalled(express.mockResponse.status);
					assert.notCalled(express.mockResponse.send);
				});

				it('Calls `next` with a new HTTP 401 error', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 401, 'An apiKey query parameter is required');
					assert.calledOnce(next);
					assert.calledWithExactly(next, httpError.mockError);
				});

			});

			describe('when the `request` has an incorrect `apiKey` query parameter', () => {

				beforeEach(() => {
					express.mockResponse.status.resetHistory();
					express.mockResponse.send.resetHistory();
					express.mockRequest.query.apiKey = 'not-the-key';
					return middleware(express.mockRequest, express.mockResponse, next);
				});

				it('does not respond', () => {
					assert.notCalled(express.mockResponse.status);
					assert.notCalled(express.mockResponse.send);
				});

				it('Calls `next` with a new HTTP 403 error', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 403, 'You do not have permission to purge URLs');
					assert.calledOnce(next);
					assert.calledWithExactly(next, httpError.mockError);
				});

			});

			describe('when one of the HTTP requests fails', () => {
				let mockHttpError;

				beforeEach(() => {
					express.mockResponse.status.resetHistory();
					express.mockResponse.send.resetHistory();
					mockHttpError = new Error('http error');
					httpRequest.rejects(mockHttpError);
					return middleware(express.mockRequest, express.mockResponse, next);
				});

				it('Logs the HTTP error', () => {
					assert.calledWithExactly(log.error, 'Error purging URLs: http error');
				});

			});

			describe('when one of the HTTP requests responds with a 401 status code', () => {

				beforeEach(() => {
					log.error.reset();
					mockHttpResponse.statusCode = 401;
					return middleware(express.mockRequest, express.mockResponse, next);
				});

				it('Logs a descriptive error', () => {
					assert.calledOnce(log.error);
					assert.match(log.error.firstCall.args[0], /Unable to purge URL from Fastly, permission denied for: https:\/\/mock-url\//i);
				});

			});

			describe('when one of the HTTP requests responds with an unsuccessful status code', () => {

				beforeEach(() => {
					log.error.reset();
					mockHttpResponse.statusCode = 500;
					return middleware(express.mockRequest, express.mockResponse, next);
				});

				it('Logs a generic server error', () => {
					assert.calledOnce(log.error);
					assert.match(log.error.firstCall.args[0], /Unable to purge URL from Fastly: https:\/\/mock-url\//i);
				});

			});

		});

	});

});
