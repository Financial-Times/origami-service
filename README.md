
Origami Service
===============

Provides an extended [Express], as well as useful tools for building consistent Origami services.

  - [Usage](#usage)
    - [Requirements](#requirements)
    - [API Documentation](#api-documentation)
    - [Options](#options)
    - [Examples](#examples)
  - [Contributing](#contributing)
  - [Contact](#contact)
  - [Licence](#licence)


Usage
-----

### Requirements

Running the Origami Service module requires [Node.js] 6.x and [npm]. You can install with:

```sh
npm install @financial-times/origami-service
```

### API Documentation

This library makes use of [promises], and provides a wrapper around [Express] – familiarity is assumed in the rest of the API documentation. You'll also need to require the module with:

```js
const origamiService = require('@financial-times/origami-service');
```

### `origamiService( [options] )`

This function returns a promise which resolves with a new [Express] application. The Express application will be started automatically, and the returned promise will reject if there's an error in startup.

You can configure the created service with [an options object](#options) if you need to override any defaults.

```js
origamiService({
    port: 1234
})
.then(app => {
    // do something with the app
})
.catch(error => {
    // handle the error
});
```

The Express application will have some additional properties, added by the Origami Service module:

  - `app.origami.options`: The defaulted [options](#options) passed into the `origamiService` call
  - `app.origami.server`: The [HTTP Server] which was returned by `app.listen`

### Options

The Origami Service module can be configured with a variety of options, passed in as an object to the `origamiService` function or as [environment variables]. The priority given to each type of configuration is important:

  1. **Options object:** options passed in as an `options` object will take priority over everything. E.g. this means if you hard-code the `port` configuration in your code, the `PORT` environment variable will cease to work.
  2. **Environment:** if an option isn't found in the `options` object, then for some options an environment variable will be checked. The names of these are slightly different, and will be documented below.
  3. **Defaults:** if an option isn't found in the `options` object _or_ environment, then it will use the default value as documented below.

The available options are as follows. Where two names are separated by a `/`, the first is the object key and the second is the environment variable:

  - `port/PORT`: The port that the application should run on. Defaults to `8080`
  - `region/REGION`: The region to use in logging and reporting for the application. Defaults to `'EU'`

### Examples

You can find example implementations of Origami-compliant services in the `examples` folder of this repo:

  - **Basic:** start a bare-bones Origami service with only the default options:

    ```sh
    node examples/basic
    ```

  - **Options:** start an Origami service with some overridden [options](#options):

    ```sh
    node examples/options
    ```


Contributing
------------

This module has a full suite of unit tests, and is verified with ESLint. You can use the following commands to check your code before opening a pull request.

```sh
make verify  # verify JavaScript code with ESLint
make test    # run the unit tests and check coverage
```


Contact
-------

If you have any questions or comments about this module, or need help using it, please either [raise an issue][issues], visit [#ft-origami] or email [Origami Support].


Licence
-------

This software is published by the Financial Times under the [MIT licence][license].



[#ft-origami]: https://financialtimes.slack.com/messages/ft-origami/
[environment variables]: https://en.wikipedia.org/wiki/Environment_variable
[express]: http://expressjs.com/
[http server]: https://nodejs.org/api/http.html#http_class_http_server
[issues]: https://github.com/Financial-Times/origami-service/issues
[license]: http://opensource.org/licenses/MIT
[node.js]: https://nodejs.org/
[npm]: https://www.npmjs.com/
[origami support]: mailto:origami-support@ft.com
[promises]: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise
