'use strict';

const sinon = require('sinon');

const express = module.exports = sinon.stub();
const mockApp = module.exports.mockApp = {
	disable: sinon.stub(),
	enable: sinon.stub(),
	get: sinon.stub(),
	listen: sinon.stub(),
	locals: {},
	set: sinon.stub(),
	use: sinon.stub()
};
const mockServer = module.exports.mockServer = {};

express.returns(mockApp);
mockApp.listen.returns(mockServer).yieldsAsync();

module.exports.mockRequest = {
	headers: {},
	query: {},
	params: {}
};

module.exports.mockResponse = {
	app: mockApp,
	locals: {},
	redirect: sinon.stub().returnsThis(),
	render: sinon.stub().returnsThis(),
	send: sinon.stub().returnsThis(),
	set: sinon.stub().returnsThis(),
	status: sinon.stub().returnsThis()
};
