'use strict';

const sinon = require('sinon');

const raven = module.exports = {
	config: sinon.stub(),
	install: sinon.stub()
};
const mockRequestMiddleware = raven.mockRequestMiddleware = sinon.stub();
const mockErrorMiddleware = raven.mockErrorMiddleware = sinon.stub();

raven.config.returns(raven);
raven.install.returns(raven);
raven.requestHandler = sinon.stub().returns(mockRequestMiddleware);
raven.errorHandler = sinon.stub().returns(mockErrorMiddleware);
