'use strict';

const express = require('express');

module.exports = origamiService;

function origamiService() {
	const app = express();
	app.origami = {};
	return promiseToStart(app);
}

function promiseToStart(app) {
	return new Promise((resolve, reject) => {
		app.origami.server = app.listen(null, error => {
			if (error) {
				return reject(error);
			}
			resolve(app);
		});
	});
}
