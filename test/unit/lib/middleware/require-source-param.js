'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/middleware/require-source-param', () => {
	let express;
	let httpError;
	let requireSourceParam;

	beforeEach(() => {
		express = require('../../mock/express.mock');

		httpError = require('../../mock/http-errors.mock');
		mockery.registerMock('http-errors', httpError);

		requireSourceParam = require('../../../../lib/middleware/require-source-param');
	});

	it('exports a function', () => {
		assert.isFunction(requireSourceParam);
	});

	describe('requireSourceParam()', () => {
		let middleware;

		beforeEach(() => {
			middleware = requireSourceParam();
		});

		it('returns a middleware function', () => {
			assert.isFunction(middleware);
		});

		describe('middleware(request, response, next)', () => {
			let next;

			beforeEach(() => {
				next = sinon.spy();
				express.mockRequest.query.source = 'test';
				middleware(express.mockRequest, express.mockResponse, next);
			});

			it('calls `next` with no error', () => {
				assert.calledOnce(next);
				assert.calledWithExactly(next);
			});

			describe('when the `source` query parameter is missing', () => {

				beforeEach(() => {
					next.reset();
					httpError.reset();
					delete express.mockRequest.query.source;
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('creates a 400 HTTP error with a descriptive message', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 400, 'The source parameter is required and should be a valid system code');
				});

				it('calls `next` with the created error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next, httpError.mockError);
				});

			});

			describe('when the `source` query parameter is an empty string', () => {

				beforeEach(() => {
					next.reset();
					httpError.reset();
					express.mockRequest.query.source = '';
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('creates a 400 HTTP error with a descriptive message', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 400, 'The source parameter is required and should be a valid system code');
				});

				it('calls `next` with the created error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next, httpError.mockError);
				});

			});

			describe('when the `source` query parameter is longer than 255 characters', () => {

				beforeEach(() => {
					next.reset();
					httpError.reset();
					express.mockRequest.query.source = Array(256).fill('x').join('');
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('creates a 400 HTTP error with a descriptive message', () => {
					assert.calledOnce(httpError);
					assert.calledWithExactly(httpError, 400, 'The source parameter is required and should be a valid system code');
				});

				it('calls `next` with the created error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next, httpError.mockError);
				});

			});

		});

	});

});
