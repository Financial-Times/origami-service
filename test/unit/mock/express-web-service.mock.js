'use strict';

const sinon = require('sinon');

const expressWebService = module.exports = sinon.stub();
const mockMiddleware = expressWebService.mockMiddleware = sinon.stub();

expressWebService.returns(mockMiddleware);
