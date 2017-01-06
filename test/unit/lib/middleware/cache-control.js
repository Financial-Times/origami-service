'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/middleware/cache-control', () => {
	let cacheControl;
	let express;
	let ms;

	beforeEach(() => {
		express = require('../../mock/express.mock');

		ms = require('../../mock/ms.mock');
		mockery.registerMock('ms', ms);

		ms.withArgs('1 hour').returns(3600000);
		ms.withArgs('1 day').returns(86400000);

		cacheControl = require('../../../../lib/middleware/cache-control');
	});

	it('exports a function', () => {
		assert.isFunction(cacheControl);
	});

	describe('cacheControl(options)', () => {
		let middleware;

		beforeEach(() => {
			middleware = cacheControl({
				maxAge: '1 hour'
			});
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

			it('calls `ms` with `options.maxAge`', () => {
				assert.calledOnce(ms);
				assert.calledWithExactly(ms, '1 hour');
			});

			it('sets the `Cache-Control` header to the return of the `ms` call divided by 1000', () => {
				assert.calledOnce(express.mockResponse.set);
				assert.calledWithExactly(express.mockResponse.set, 'Cache-Control', 'max-age=3600, public, stale-if-error=3600, stale-while-revalidate=3600');
			});

			it('calls `next` with no error', () => {
				assert.calledOnce(next);
				assert.calledWithExactly(next);
			});

			describe('when `options.maxAge` is falsy', () => {

				beforeEach(() => {
					express.mockResponse.set.reset();
					middleware = cacheControl({
						maxAge: null
					});
				});

				describe('middleware(request, response, next)', () => {

					beforeEach(() => {
						middleware(express.mockRequest, express.mockResponse, next);
					});

					it('sets the `Cache-Control` header to not cache', () => {
						assert.calledOnce(express.mockResponse.set);
						assert.calledWithExactly(express.mockResponse.set, 'Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
					});

				});

			});

			describe('when `options.staleIfError` is set', () => {

				beforeEach(() => {
					ms.reset();
					express.mockResponse.set.reset();
					middleware = cacheControl({
						maxAge: '1 hour',
						staleIfError: '1 day'
					});
				});

				describe('middleware(request, response, next)', () => {

					beforeEach(() => {
						middleware(express.mockRequest, express.mockResponse, next);
					});

					it('calls `ms` with `options.maxAge` and `options.staleIfError`', () => {
						assert.calledTwice(ms);
						assert.calledWithExactly(ms, '1 hour');
						assert.calledWithExactly(ms, '1 day');
					});

					it('sets the `Cache-Control` header to have a different `stale-if-error` directive', () => {
						assert.calledOnce(express.mockResponse.set);
						assert.calledWithExactly(express.mockResponse.set, 'Cache-Control', 'max-age=3600, public, stale-if-error=86400, stale-while-revalidate=3600');
					});

				});

			});

			describe('when `options.staleIfError` is set to a falsy value but not undefined', () => {

				beforeEach(() => {
					ms.reset();
					express.mockResponse.set.reset();
					middleware = cacheControl({
						maxAge: '1 hour',
						staleIfError: null
					});
				});

				describe('middleware(request, response, next)', () => {

					beforeEach(() => {
						middleware(express.mockRequest, express.mockResponse, next);
					});

					it('calls `ms` with `options.maxAge` only', () => {
						assert.calledOnce(ms);
						assert.calledWithExactly(ms, '1 hour');
					});

					it('sets the `Cache-Control` header to have no `stale-if-error` directive', () => {
						assert.calledOnce(express.mockResponse.set);
						assert.calledWithExactly(express.mockResponse.set, 'Cache-Control', 'max-age=3600, public, stale-while-revalidate=3600');
					});

				});

			});

			describe('when `options.staleWhileRevalidate` is set', () => {

				beforeEach(() => {
					ms.reset();
					express.mockResponse.set.reset();
					middleware = cacheControl({
						maxAge: '1 hour',
						staleWhileRevalidate: '1 day'
					});
				});

				describe('middleware(request, response, next)', () => {

					beforeEach(() => {
						middleware(express.mockRequest, express.mockResponse, next);
					});

					it('calls `ms` with `options.maxAge` and `options.staleWhileRevalidate`', () => {
						assert.calledTwice(ms);
						assert.calledWithExactly(ms, '1 hour');
						assert.calledWithExactly(ms, '1 day');
					});

					it('sets the `Cache-Control` header to have a different `stale-while-revalidate` directive', () => {
						assert.calledOnce(express.mockResponse.set);
						assert.calledWithExactly(express.mockResponse.set, 'Cache-Control', 'max-age=3600, public, stale-if-error=3600, stale-while-revalidate=86400');
					});

				});

			});

			describe('when `options.staleWhileRevalidate` is set to a falsy value but not undefined', () => {

				beforeEach(() => {
					ms.reset();
					express.mockResponse.set.reset();
					middleware = cacheControl({
						maxAge: '1 hour',
						staleWhileRevalidate: null
					});
				});

				describe('middleware(request, response, next)', () => {

					beforeEach(() => {
						middleware(express.mockRequest, express.mockResponse, next);
					});

					it('calls `ms` with `options.maxAge` only', () => {
						assert.calledOnce(ms);
						assert.calledWithExactly(ms, '1 hour');
					});

					it('sets the `Cache-Control` header to have no `stale-while-revalidate` directive', () => {
						assert.calledOnce(express.mockResponse.set);
						assert.calledWithExactly(express.mockResponse.set, 'Cache-Control', 'max-age=3600, public, stale-if-error=3600');
					});

				});

			});

		});

	});

});
