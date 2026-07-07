# Changelog

## [2.1.0](https://github.com/shawnphoffman/hospitality-channels/compare/v2.0.0...v2.1.0) (2026-07-07)

### Features

* **web:** add a shared tag vocabulary across programs and clips ([556a72b](https://github.com/shawnphoffman/hospitality-channels/commit/556a72b3ff1766eb4a1886fe3709cd21a4639d37))
* **web:** add duplication for programs, custom templates, and publish profiles ([d3a803a](https://github.com/shawnphoffman/hospitality-channels/commit/d3a803a992559ee3d8862cbd042bfadb6c54f6f2))
* **web:** redesign Programs and Clips as tagged split-pane browsers ([fdc70ec](https://github.com/shawnphoffman/hospitality-channels/commit/fdc70ec23aaf3b6e0186fed1726fbee95854404d))

### Bug Fixes

* **tunarr:** push manual lineup as content items, not invalid index type ([df6ab69](https://github.com/shawnphoffman/hospitality-channels/commit/df6ab6925f8f507c813e15b3accdf0ac459438ae))

## [2.0.0](https://github.com/shawnphoffman/hospitality-channels/compare/v1.3.0...v2.0.0) (2026-07-07)

### ⚠ BREAKING CHANGES

* **deps:** requires Node-side React 19 peer dependencies; no application-facing behavior change.

### Features

* **api:** validate request bodies and harden asset uploads ([b1724f9](https://github.com/shawnphoffman/hospitality-channels/commit/b1724f94e072f51ca2ea07925d595fdaff3e208b))
* **db:** track schema migrations and adopt legacy databases ([793a7e1](https://github.com/shawnphoffman/hospitality-channels/commit/793a7e1195d12341871c6d704cce8e05f3848fb4))
* **tunarr:** add step-by-step diagnostics to settings ([4ca318f](https://github.com/shawnphoffman/hospitality-channels/commit/4ca318f641fda736dda4766f5c2480e78f846bd1))
* **web:** improve error surfacing, preview performance, and dedupe QR components ([4eb5904](https://github.com/shawnphoffman/hospitality-channels/commit/4eb5904e851109375d5bde8b19fa3cff6e8d6a79))
* **worker:** recover stuck jobs, retry failures, and guard asset downloads ([df9cb3c](https://github.com/shawnphoffman/hospitality-channels/commit/df9cb3c6c7e78521ced312d7e6b7c3250d891e5a))

### Bug Fixes

* **deps:** bump drizzle-orm to 0.45.2 for SQL identifier escaping advisory ([047892a](https://github.com/shawnphoffman/hospitality-channels/commit/047892a33f286908f020a6b117a14f2961d7a15e))
* **deps:** clear remaining drizzle-orm and postcss advisories ([66ccb79](https://github.com/shawnphoffman/hospitality-channels/commit/66ccb79fd17c95ee4b7055dbf779c505d824cc78))
* **deps:** patch remaining advisories via tooling bumps and overrides ([ff59bd6](https://github.com/shawnphoffman/hospitality-channels/commit/ff59bd6aa7276facc0db5ffceedecaf9247e16aa))
* **deps:** upgrade Next.js to 15 and React to 19 ([7fccffd](https://github.com/shawnphoffman/hospitality-channels/commit/7fccffde79431c6c5af2471589cc3bf3a23dd5b6))
* **tunarr:** match programs across API shapes and stop pushes from hanging or failing silently ([9b23a01](https://github.com/shawnphoffman/hospitality-channels/commit/9b23a011303fa12bc330f7d0fd4e9628c0ef024f))

## [1.3.0](https://github.com/shawnphoffman/hospitality-channels/compare/v1.2.2...v1.3.0) (2026-04-23)

### Features

* harden and parallelize render pipeline ([8c3d27e](https://github.com/shawnphoffman/hospitality-channels/commit/8c3d27e2337fda4e54ded6159d80789ff7af96f8))

## [1.2.2](https://github.com/shawnphoffman/hospitality-channels/compare/v1.2.1...v1.2.2) (2026-04-08)

## [1.2.1](https://github.com/shawnphoffman/hospitality-channels/compare/v1.2.0...v1.2.1) (2026-04-08)

### Bug Fixes

* use client-side navigation and persist sidebar state ([415a949](https://github.com/shawnphoffman/hospitality-channels/commit/415a949da9f3b75255f638229627e6a2d6afce16))

## [1.2.0](https://github.com/shawnphoffman/hospitality-channels/compare/v1.1.0...v1.2.0) (2026-04-08)

### Features

* add Channel Offline built-in template ([92632b1](https://github.com/shawnphoffman/hospitality-channels/commit/92632b182f4411e88b20e7dcb76c1974036db3c7))

### Bug Fixes

* improve mobile responsiveness and sidebar toggle overflow ([b7237da](https://github.com/shawnphoffman/hospitality-channels/commit/b7237daf2d2f93a1910ed2e3404df46a921dacd2))

## [1.1.0](https://github.com/shawnphoffman/hospitality-channels/compare/v1.0.1...v1.1.0) (2026-04-08)

### Features

* add support/donate modal to sidebar ([b6a7736](https://github.com/shawnphoffman/hospitality-channels/commit/b6a7736a78b1bedf2f8921cd3779b66e35f2a224))

## [1.0.1](https://github.com/shawnphoffman/hospitality-channels/compare/v1.0.0...v1.0.1) (2026-04-08)

## 1.0.0 (2026-04-07)

Initial release.

### Features

- Template-driven video clip creation with 9 built-in templates
- Composable template editor for creating custom templates in-browser
- Program composition with multiple clips, transitions, and background audio
- MP4 rendering via headless Chromium + FFmpeg
- Multi-profile publishing with configurable export paths
- Tunarr integration (library scan, metadata enrichment, channel push)
- Asset management for images, audio, and video
- Seamless loop transitions for programs
- Docker support with optional full Unicode font coverage
