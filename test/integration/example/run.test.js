'use strict';

const assert = require('proclaim');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

describe('examples', () => {
	const basePath = path.resolve(__dirname, '../../../example');

	fs.readdirSync(basePath).forEach(directory => {
		describe(directory, () => {
			const examplePath = path.join(basePath, directory);
			const indexPath = path.join(examplePath, 'index.js');

			it('should be a directory', () => {
				assert.isTrue(fs.statSync(examplePath).isDirectory());
			});

			it('should contain an `index.js` file', () => {
				assert.isTrue(fs.statSync(indexPath).isFile());
			});

			it('should run with no errors', done => {

				const example = childProcess.fork(indexPath, {
					env: {PORT: ''},
					silent: true
				});

				const timeout = setTimeout(() => {
					example.kill('SIGKILL');
					done();
				}, 2000);

				example.on('error', error => {
					clearTimeout(timeout);
					example.kill('SIGKILL');
					done(error);
				});

				example.stderr.on('data', chunk => {
					// allow warnings
					if (/^warning:/i.test(chunk.toString())) {
						return;
					}
					clearTimeout(timeout);
					example.kill('SIGKILL');
					const error = new Error(`example output to stderr: ${chunk.toString()}`);
					done(error);
				});

			});

		});
	});

});
