
Migration Guide
===============

Origami Service's API changes between major versions. This is a guide to help you make the switch when this happens.


Table Of Contents
-----------------

  - [Migrating from 1.0 to 2.0](#migrating-from-10-to-20)


Migrating from 1.0 to 2.0
-------------------------

### Middleware

Origami Service 2.0 removes the `requireSourceParam` middleware. You can now find this middleware in a separate module: [`@financial-times/source-param-middleware`](https://github.com/Financial-Times/source-param-middleware).

### Environment Variables

Deprecated environment variables have been removed:

  - `FT_GRAPHITE_APIKEY` should be replaced with `GRAPHITE_API_KEY`
  - `RAVEN_URL` should be replaced with `SENTRY_DSN`
