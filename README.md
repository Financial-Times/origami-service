
Origami Service
===============

Provides an extended [Express], as well as useful tools for building consistent Origami services.

[![NPM version](https://img.shields.io/npm/v/@financial-times/origami-service.svg)](https://www.npmjs.com/package/@financial-times/origami-service)
[![Build status](https://img.shields.io/circleci/project/Financial-Times/origami-service.svg)](https://circleci.com/gh/Financial-Times/origami-service)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)][license]


Table Of Contents
-----------------

  - [Usage](#usage)
    - [Requirements](#requirements)
    - [API Documentation](#api-documentation)
    - [Options](#options)
    - [Examples](#examples)
  - [Contributing](#contributing)
  - [Publishing](#publishing)
  - [Support and Migration](#support-and-migration)
  - [Contact](#contact)
  - [Licence](#licence)


Usage
-----

### Requirements

Running the Origami Service module requires [Node.js] 8.x and [npm]. You can install with:

```sh
npm install @financial-times/origami-service
```

### API Documentation

This library makes use of [promises], and provides a wrapper around [Express] – familiarity is assumed in the rest of the API documentation. You'll also need to require the module with:

```js
const origamiService = require('@financial-times/origami-service');
```

### `origamiService( [options] )`

This function returns a new [Express] application preconfigured to run as an Origami service. You can configure the created service with [an options object](#options) if you need to override any defaults.

```js
const app = origamiService({
    port: 1234
});
```

The application's `listen` function has a different signature to Express, it's wrapped in a promise and uses the `port` option from the constructor:

```js
const app = origamiService({
    port: 1234
});
app.listen(); // runs on port 1234 and returns a promise
```

The Express application will have some additional properties, added by the Origami Service module. These will also be added to `app.locals` so they're available in your views.

  - `app.ft.log`: The logger passed in to the service
  - `app.ft.metrics`: The [Next Metrics] instance which can be used to send additional data to Graphite
  - `app.ft.options`: The defaulted [options](#options) passed into the `origamiService` call
  - `app.ft.server`: The [HTTP Server] which was returned by `app.listen`

The following [Express settings] will be set:

  - `case sensitive routing`: Enabled
  - `json spaces`: Configured to prettify output JSON
  - `x-powered-by`: Disabled
  - `views`: Configured to the `views` folder
  - `view engine`: Configured to use [Handlebars]

[Handlebars] will be used as a view engine with the extension `.html`. We use [Express Handlebars] for this, which means layouts and partials are supported. Add layouts and partials to `views/layouts` and `views/partials` respectively. See [the examples](#examples) for more information.

Some middleware will also be mounted by default, in this order:

  - [Express Web Service]: To provide `/__about`, `/__health`, and `/__gtg` endpoints (as well as `/__error` if configured to)
  - [Next Metrics]: To send request/response data to Graphite
  - [Morgan]: To log requests (requests to `/__gtg`, `/__health`, and `/favicon.ico` are never logged)
  - [Static]: To serve files in the application's `public` folder

### Options

The Origami Service module can be configured with a variety of options, passed in as an object to the `origamiService` function or as [environment variables]. The priority given to each type of configuration is important:

  1. **Options object:** options passed in as an `options` object will take priority over everything. E.g. this means if you hard-code the `port` configuration in your code, the `PORT` environment variable will cease to work.
  2. **Environment:** if an option isn't found in the `options` object, then for some options an environment variable will be checked. The names of these are slightly different, and will be documented below.
  3. **Defaults:** if an option isn't found in the `options` object _or_ environment, then it will use the default value as documented below.

The available options are as follows. Where two names are separated by a `/`, the first is the object key and the second is the environment variable:

  - `about`: About information to populate the `/__about` endpoint with. This should be an object which conforms to the FT's [about/runbook standard][about-standard]. This defaults the `name/purpose` properties to `name/description` from your `package.json` file if they're not set. This option gets passed on to [Express Web Service]
  - `basePath`: The base path of the application, which paths (e.g. public files) will be relative to. Defaults to `process.cwd()`
  - `defaultLayout`: The default layout file to use in view rendering. This should be the name of an HTML file in the `views/layouts` directory, e.g. `'main'` would map to `views/layouts/main.html`. Defaults to `false`
  - `handlebarsHelpers`: Handlebars helpers configuration. This should be an object. Defaults to an empty object.
  - `exposeErrorEndpoint/EXPOSE_ERROR_ENDPOINT`: Whether to expose the `/__error` endpoint for debugging purposes. This should be `false` in production. Defaults to `false`
  - `environment/NODE_ENV`: The environment to run in. This affects things like public file max ages. One of `'production'`, `'development'`, or `'test'`. Defaults to `'development'`
  - `goodToGoTest`: A function to use in calculating whether the application is good to go. See [Express Web Service] for more information
  - `graphiteAppUUID/FT_GRAPHITE_APP_UUID`: The graphite UUID to use when recording metrics.
  - `healthCheck`: A function to use in calculating how healthy the application is. See [Express Web Service] for more information
  - `log`: A console object used to output non-request logs. Defaults to the global `console` object
  - `metricsAppName`: The name of the application to use when logging to Graphite. Defaults to `about.systemCode` then `about.name`
  - `port/PORT`: The port that the application should run on. Defaults to `8080`.
  - `region/REGION`: The region to use in logging and reporting for the application. Defaults to `'EU'`
  - `requestLogFormat`: The [Morgan] log format to output request logs in. If set to `null`, request logs will not be output. Defaults to `'combined'`
  - `sentryConfig`: Additional [Sentry] configurations. This is passed directly to the Raven configuration, [see here for more information][raven-config]. Defaults to `{}`
  - `sentryDsn/SENTRY_DSN`: The [Sentry] DSN to send errors to. If set to `null`, errors will not be sent to Sentry. Defaults to `null`

### `origamiService.middleware.notFound( [message] )`

Create and return a middleware for throwing `404` "Not Found" errors. The returned middleware will pass on an error which can be caught later by an error handling middleware. The error will have a `status` property set to `404` so that your error handler can differentiate it from other errors, as well as a `cacheMaxAge` property set to `'30s'`.

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

Create and return a middleware for rendering errors that occur in the application routes. The returned middleware logs errors to [Sentry] (if the `sentryDsn` option is present) and then renders an error page.

The following properties can be set on an error object to change the behaviour of the error handler:

  - `status`: decide on which error type to render and send the HTTP status code
  - `cacheMaxAge`: the maximum cache age of the error, which gets passed to the [`cacheControl` middleware](#origamiservicemiddlewarecachecontrol-options-)
  - `skipSentry`: if set to `true`, the error will not be reported to Sentry

This middleware should be mounted after all of your application routes, and is useful in conjunction with `origamiService.middleware.notFound`:

```js
// routes go here
app.use(origamiService.middleware.notFound());
app.use(origamiService.middleware.errorHandler());
```

The error handling middleware will look for a Handlebars template in `views/error.html` and use it to render the page. If no template is found in that location then it falls back to basic HTML output. This allows you to style your error pages and use your application's default layout.

### `origamiService.middleware.getBasePath()`

Calculate the base path that the application is running on and provide it for use in later middleware and templates. This middleware reads and normalises the `FT-Origami-Service-Base-Path` header (which should be set by the CDN) and adds it to:

  - `request.basePath`: for later middleware to use
  - `response.locals.basePath`: for templates to use

```js
app.use(origamiService.middleware.getBasePath());
// routes go here
```

### `origamiService.middleware.cacheControl( options )`

Add a `Cache-Control` header to the response, including `stale-if-error` and `stale-while-revalidate` directives. The available options are:

  - `maxAge`: The max age to set in the `Cache-Control` header. Must be a valid string that [the ms library can parse](ms-examples). Required
  - `staleIfError`: Override the `stale-if-error` directive. Must be a valid string that [the ms library can parse](ms-examples). Defaults to the same value as `maxAge`
  - `staleWhileRevalidate`: Override the `stale-while-revalidate` directive. Must be a valid string that [the ms library can parse](ms-examples). Defaults to the same value as `maxAge`

This middleware is best used per-route, rather than at the application level:

```js
app.get('/docs', origamiService.middleware.cacheControl({maxAge: '1 day'}), () => {
    // route stuff
});
```

### `origamiService.middleware.purgeUrls( options )`

Create a purge route which will purge all of the given URLs in Fastly when the endpoint is POSTed to. This endpoint accepts general options as well as per-request options in the querystring.

The general options are:

  - `fastlyApiKey/FASTLY_PURGE_API_KEY`: The Fastly API key to use when purging URLs
  - `purgeApiKey/PURGE_API_KEY`: The API key that is required when a user requests the purge endpoint. If they don't provide this, then the purge will not be performed
  - `urls`: The URLs that will be purged as an array of strings. This should contain full URLs with a scheme and hostname, that are permitted to be purged with the given Fastly API key

When a user requests the created endpoint, they can use query string parameters to change behaviour:

  - `apiKey`: This is required, and must match the `purgeApiKey` option to work. If this is not provided or is incorrect, an error will be displayed
  - `wait`: A number of milliseconds to wait before the purge is performed. This can be used to ensure that the purge is performed only once a new version of the application is running. Defaults to `0`

This middleware should be mounted as a route, rather than at the application level:

```js
app.post('/purge', origamiService.middleware.purgeUrls({
    urls: [
        'https://example.com/url-1',
        'https://example.com/url-2'
    ]
}));
```

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

Publishing
----------

New versions of the module are published automatically by CI when a new tag is created matching the pattern `/v.*/`.


Support and Migration
---------------------

Origami Service major versions are normally supported for 3–6 months after their last minor release. This means that patch-level changes will be added and bugs will be fixed. The table below outlines the end-of-support dates for major versions, and the last minor release for that version.

We also maintain a [migration guide](MIGRATION.md) to help you migrate.

| :grey_question: | Major Version | Last Minor Release | Node.js Versions | Support End Date |
| :-------------- | :------------ | :----------------- | :--------------- | :--------------- |
| :heart:         | 4             | N/A                | 8+               | N/A              |
| :hourglass:     | 3             | 3.0                | 8                | 2019-03-27       |
| :skull:         | 2             | 2.5                | 6-8              | 2018-08-27       |
| :skull:         | 1             | 1.6                | 6                | 2017-05-15       |

If you're opening issues related to these, please mention the version that the issue relates to.


Contact
-------

If you have any questions or comments about this module, or need help using it, please either [raise an issue][issues], visit [#ft-origami] or email [Origami Support].


Licence
-------

This software is published by the Financial Times under the [MIT licence][license].



[#ft-origami]: https://financialtimes.slack.com/messages/ft-origami/
[about-standard]: https://docs.google.com/document/d/1B80a0nAI8L1cuIlSEai4Zuztq7Lef0ytxJYNFCjG7Ko/edit
[environment variables]: https://en.wikipedia.org/wiki/Environment_variable
[express]: http://expressjs.com/
[express handlebars]: https://github.com/ericf/express-handlebars
[express settings]: https://expressjs.com/en/4x/api.html#app.settings.table
[express web service]: https://github.com/Financial-Times/express-web-service
[handlebars]: http://handlebarsjs.com/
[http server]: https://nodejs.org/api/http.html#http_class_http_server
[issues]: https://github.com/Financial-Times/origami-service/issues
[license]: http://opensource.org/licenses/MIT
[morgan]: https://github.com/expressjs/morgan
[ms-examples]: https://github.com/zeit/ms#examples
[next metrics]: https://github.com/Financial-Times/next-metrics
[node.js]: https://nodejs.org/
[npm]: https://www.npmjs.com/
[origami support]: mailto:origami-support@ft.com
[promises]: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise
[raven-config]: https://docs.sentry.io/clients/node/config/#optional-settings
[sentry]: https://sentry.io/
[static]: https://expressjs.com/en/starter/static-files.html
