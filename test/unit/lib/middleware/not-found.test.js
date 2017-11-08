'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/middleware/not-found', () => {
	let express;
	let httpError;
	let notFound;

	beforeEach(() => {
		express = require('../../mock/express.mock');

		httpError = require('../../mock/http-errors.mock');
		mockery.registerMock('http-errors', httpError);

		notFound = require('../../../../lib/middleware/not-found');
	});

	it('exports a function', () => {
		assert.isFunction(notFound);
	});

	describe('notFound(message)', () => {
		let middleware;

		beforeEach(() => {
			middleware = notFound('mock message');
		});

		it('returns a middleware function', () => {
			assert.isFunction(middleware);
		});

		describe('middleware(request, response, next)', () => {
			let next;

			beforeEach(() => {
				next = sinon.spy();
				middleware(express.mockRequest, express.mockResponse, next);
			});

			it('creates a 404 HTTP error with the specified message', () => {
				assert.calledOnce(httpError);
				assert.calledWithExactly(httpError, 404, 'mock message');
			});

			it('adds a `cacheMaxAge` property to the error, caching for 30 seconds', () => {
				assert.strictEqual(httpError.mockError.cacheMaxAge, '30s');
			});

			it('calls `next` with the created error', () => {
				assert.calledOnce(next);
				assert.calledWithExactly(next, httpError.mockError);
			});

		});

		describe('when `message` is not defined', () => {

			beforeEach(() => {
				middleware = notFound();
			});

			describe('middleware(request, response, next)', () => {
				let next;

				beforeEach(() => {
					next = sinon.spy();
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('creates a 404 HTTP error with no custom message', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 404, undefined);
				});

				it('calls `next` with the created error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next, httpError.mockError);
				});

			});

		});

	});

});
