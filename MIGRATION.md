
Migration Guide
===============

Origami Service's API changes between major versions. This is a guide to help you make the switch when this happens.


Table Of Contents
-----------------

  - [Migrating from 6.0 to 7.0](#migrating-from-60-to-70)
  - [Migrating from 5.0 to 6.0](#migrating-from-50-to-60)
  - [Migrating from 4.0 to 5.0](#migrating-from-40-to-50)
  - [Migrating from 3.0 to 4.0](#migrating-from-30-to-40)
  - [Migrating from 2.0 to 3.0](#migrating-from-20-to-30)
  - [Migrating from 1.0 to 2.0](#migrating-from-10-to-20)

Migrating from 6.0 to 7.0
-------------------------

`next-metrics` has been removed as a dependency, meaning metrics will no longer be provided.

If you still require metrics, please follow EDO's guide to [remove graphite from apps](https://financialtimes.atlassian.net/wiki/spaces/DS/pages/8408989698/Migrating+an+app+away+from+Graphite-based+health+checks).

Migrating from 5.0 to 6.0
-------------------------

Support for NodeJS version 10 has been dropped in origami-service version 6, this is due to [next-metrics](https://github.com/Financial-Times/next-metrics/tree/main) supporting a minimum of NodeJS 16.

Please ensure you are using NodeJS version 18 or later.

Migrating from 4.0 to 5.0
-------------------------

Support for NodeJS version 8 has been dropped in origami-service version 5, this is due to handlebars no longer supporting NodeJS version 8.

Please ensure you are using NodeJS version 10 or later.


Migrating from 3.0 to 4.0
-------------------------

### Options

Configuration options have been renamed:

  - `graphiteApiKey` and `GRAPHITE_API_KEY` should be replaced with `graphiteAppUUID` and `FT_GRAPHITE_APP_UUID`. We now require each application to provide its own Graphite UUID.


Migrating from 2.0 to 3.0
-------------------------

### Properties

Origami Service 3.0 renames the `app.origami` property to `app.ft`. This is also renamed in the views, the global `origami` view variable is named `ft`.

### Logs

Origami Service 3.0 doesn't include `/__gtg` and `/__health` endpoints in the request logs.


Migrating from 1.0 to 2.0
-------------------------

### Middleware

Origami Service 2.0 removes the `requireSourceParam` middleware. You can now find this middleware in a separate module: [`@financial-times/source-param-middleware`](https://github.com/Financial-Times/source-param-middleware).

### Environment Variables

Deprecated environment variables have been removed:

  - `FT_GRAPHITE_APIKEY` should be replaced with `GRAPHITE_API_KEY`
  - `RAVEN_URL` should be replaced with `SENTRY_DSN`
