
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

The Express application will have some additional properties, added by the Origami Service module. These will also be added to `app.locals` so they're available in your views.

  - `app.origami.options`: The defaulted [options](#options) passed into the `origamiService` call
  - `app.origami.server`: The [HTTP Server] which was returned by `app.listen`

The following [Express settings] will be set:

  - `json spaces`: Configured to prettify output JSON
  - `x-powered-by`: Disabled
  - `views`: Configured to the `views` folder
  - `view engine`: Configured to use [Handlebars]

[Handlebars] will be used as a view engine with the extension `.html`. We use [Express Handlebars] for this, which means layouts and partials are supported. Add layouts and partials to `views/layouts` and `views/partials` respectively. See [the examples](#examples) for more information.

Some middleware will also be mounted by default, in this order:

  - [Morgan]: To log requests
  - [Static]: To serve files in the application's `public` folder

### Options

The Origami Service module can be configured with a variety of options, passed in as an object to the `origamiService` function or as [environment variables]. The priority given to each type of configuration is important:

  1. **Options object:** options passed in as an `options` object will take priority over everything. E.g. this means if you hard-code the `port` configuration in your code, the `PORT` environment variable will cease to work.
  2. **Environment:** if an option isn't found in the `options` object, then for some options an environment variable will be checked. The names of these are slightly different, and will be documented below.
  3. **Defaults:** if an option isn't found in the `options` object _or_ environment, then it will use the default value as documented below.

The available options are as follows. Where two names are separated by a `/`, the first is the object key and the second is the environment variable:

  - `basePath`: The base path of the application, which paths (e.g. public files) will be relative to. Defaults to `process.cwd()`
  - `defaultLayout`: The default layout file to use in view rendering. This should be the name of an HTML file in the `views/layouts` directory, e.g. `'main'` would map to `views/layouts/main.html`. Defaults to `false`
  - `environment/NODE_ENV`: The environment to run in. This affects things like public file max ages. One of `'production'`, `'development'`, or `'test'`. Defaults to `'development'`
  - `log`: A console object used to output non-request logs. Defaults to the global `console` object
  - `name`: The human-readable name of the application, used in logging. Defaults to `'Origami Service'`
  - `port/PORT`: The port that the application should run on. Defaults to `8080`.
  - `region/REGION`: The region to use in logging and reporting for the application. Defaults to `'EU'`
  - `requestLogFormat`: The [Morgan] log format to output request logs in. If set to `null`, request logs will not be output. Defaults to `'combined'`
  - `sentryDsn/SENTRY_DSN`: The [Sentry] DSN to send errors to. If set to `null`, errors will not be sent to Sentry. Defaults to `null`. The `SENTRY_DSN` environment variable is aliased as `RAVEN_URL`
  - `start`: Whether to automatically start the application. Defaults to `true`

### `origamiService.middleware.notFound( [message] )`

Create and return a middleware for throwing `404` "Not Found" errors. The returned middleware will pass on an error which can be caught later by an error handling middleware. The error will have a `status` property set to `404` so that your error handler can differentiate it from other errors.

This middleware should be mounted after all of your application routes:

```js
// routes go here
app.use(origamiService.middleware.notFound());
// error handler goes here
```

By default, the error message will be set to `'Not Found'`. If you wish to specify a custom message you can specify one as a parameter:

```js
app.use(origamiService.middleware.notFound('This page does not exist'));
```

### `origamiService.middleware.errorHandler()`

Create and return a middleware for rendering errors that occur in the application routes. The returned middleware logs errors to [Sentry] (if the `sentryDsn` option is present) and then renders an error page. It uses the `status` property of an error to decide on which error type to render.

This middleware should be mounted after all of your application routes, and is useful in conjunction with `origamiService.middleware.notFound`:

```js
// routes go here
app.use(origamiService.middleware.notFound());
app.use(origamiService.middleware.errorHandler());
```

The error handling middleware will look for a Handlebars template in `views/error.html` and use it to render the page. If no template is found in that location then it falls back to basic HTML output. This allows you to style your error pages and use your application's default layout.

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

  - **Middleware:** start an Origami service using some of the built-in middleware:

    ```sh
    node examples/middleware
    ```

  - **Views:** start an Origami service with partials and layouts:

    ```sh
    node examples/views
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
[express handlebars]: https://github.com/ericf/express-handlebars
[express settings]: https://expressjs.com/en/4x/api.html#app.settings.table
[handlebars]: http://handlebarsjs.com/
[http server]: https://nodejs.org/api/http.html#http_class_http_server
[issues]: https://github.com/Financial-Times/origami-service/issues
[license]: http://opensource.org/licenses/MIT
[morgan]: https://github.com/expressjs/morgan
[node.js]: https://nodejs.org/
[npm]: https://www.npmjs.com/
[origami support]: mailto:origami-support@ft.com
[promises]: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise
[sentry]: https://sentry.io/
[static]: https://expressjs.com/en/starter/static-files.html
