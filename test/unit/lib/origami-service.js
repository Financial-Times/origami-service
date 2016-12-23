'use strict';

const assert = require('proclaim');
const mockery = require('mockery');

describe('lib/origami-service', () => {
	let express;
	let origamiService;

	beforeEach(() => {
		express = require('../mock/express.mock');
		mockery.registerMock('express', express);

		origamiService = require('../../..');
	});

	it('exports a function', () => {
		assert.isFunction(origamiService);
	});

	describe('origamiService()', () => {
		let returnedPromise;

		beforeEach(() => {
			returnedPromise = origamiService();
		});

		it('returns a promise', () => {
			assert.instanceOf(returnedPromise, Promise);
		});

		it('creates an Express application', () => {
			assert.calledOnce(express);
		});

		it('starts the Express application on a random port', () => {
			assert.calledOnce(express.mockApp.listen);
			assert.calledWith(express.mockApp.listen, null);
		});

		describe('.then()', () => {
			let app;

			beforeEach(() => {
				return returnedPromise.then(value => {
					app = value;
				});
			});

			it('resolves with the created Express application (app)', () => {
				assert.strictEqual(app, express.mockApp);
			});

			it('stores additional data in the `app.origami` object', () => {
				assert.isObject(app.origami);
			});

			it('stores the created server in `app.origami.server`', () => {
				assert.strictEqual(app.origami.server, express.mockServer);
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
