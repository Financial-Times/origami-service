'use strict';

const sinon = require('sinon');

const expressHandlebars = module.exports = {
	create: sinon.stub()
};
const mockInstance = expressHandlebars.mockInstance = {
	engine: {
		isMockEngine: true
	}
};

expressHandlebars.create.returns(mockInstance);
