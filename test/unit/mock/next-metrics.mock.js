'use strict';

const sinon = require('sinon');

const nextMetrics = module.exports = {
	Metrics: sinon.stub()
};

const mockInstance = nextMetrics.mockInstance = {
	init: sinon.stub(),
	instrument: sinon.stub()
};

nextMetrics.Metrics.returns(mockInstance);
