'use strict';

const sinon = require('sinon');

const requireAll = module.exports = sinon.stub();
const mockModules = requireAll.mockModules = {
	foo: 'bar',
	bar: 'baz'
};

requireAll.returns(mockModules);
