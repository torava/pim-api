# PIM tool

An API for product information management with support for [Fineli](https://fineli.fi/), the national Food Composition Database in Finland.

## Features
- Product information aggregation
  - Nutrient values and environmental footprint
  - Category recognition in free text form
  - Coloring based on recommendations for Fineli diary

## Installing
```
psql
DROP DATABASE "product-api"; CREATE DATABASE "product-api"; \q
npm run knex migrate:latest
npm run knex seed:run
# SEED_SUFFIX=.custom DELIMITER=, npm run knex seed:run -- --specific=categories.js
npm run dev
```

Open http://localhost:42809/api-docs in browser.
