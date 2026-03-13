## [1.1.4](https://github.com/MMoMM-org/obsidian-dynbedded/compare/1.1.3...1.1.4) (2026-03-13)


### Bug Fixes

* remove version-bump from prepareCmd to prevent double-execution ([dc39c1e](https://github.com/MMoMM-org/obsidian-dynbedded/commit/dc39c1e43598248a19cd9aac52a398e23e85a7b2))

## [1.1.3](https://github.com/MMoMM-org/obsidian-dynbedded/compare/1.1.2...1.1.3) (2026-03-13)


### Bug Fixes

* correct esbuild copy plugin config so manifest.json and styles.css copy with extension ([71681d8](https://github.com/MMoMM-org/obsidian-dynbedded/commit/71681d874e585cffc54600d5121aa18fe46e2ae1))
* run version-bump and full build inside semantic-release pipeline ([6e73abf](https://github.com/MMoMM-org/obsidian-dynbedded/commit/6e73abf66c902ed34cb262defa9af3534074f7c2))

## [1.1.2](https://github.com/MMoMM-org/obsidian-dynbedded/compare/1.1.1...1.1.2) (2026-03-13)


### Bug Fixes

* replace date headings oldest-first to prevent cascade overwrites in update-vault ([7fa0b7e](https://github.com/MMoMM-org/obsidian-dynbedded/commit/7fa0b7e902fb24ce6599cec08eb3febd76659937))
* update README section title and build manifest minAppVersion ([dcb58d9](https://github.com/MMoMM-org/obsidian-dynbedded/commit/dcb58d9e068e6e1a4f185000614fb589735b2ea7))

## [1.1.1](https://github.com/MMoMM-org/obsidian-dynbedded/compare/1.1.0...1.1.1) (2026-03-13)


### Bug Fixes

* update-vault now sets vault dates to today/yesterday instead of always adding +1 day ([37f252c](https://github.com/MMoMM-org/obsidian-dynbedded/commit/37f252cee9cd92df7a18433d936342b273b9d03d))

# [1.1.0](https://github.com/MMoMM-org/obsidian-dynbedded/compare/1.0.0...1.1.0) (2026-03-13)


### Bug Fixes

* log suppressed errors to console when debug logging is enabled ([51eea60](https://github.com/MMoMM-org/obsidian-dynbedded/commit/51eea60e4fdc9d2a4fea693581997100b96e0b92))
* null-guard getFileCache, break after header match, fix empty-header error ([#3](https://github.com/MMoMM-org/obsidian-dynbedded/issues/3) [#4](https://github.com/MMoMM-org/obsidian-dynbedded/issues/4) [#5](https://github.com/MMoMM-org/obsidian-dynbedded/issues/5)) ([0e8951b](https://github.com/MMoMM-org/obsidian-dynbedded/commit/0e8951b820f06a2b90c11c1b99a859ddc4b8ff99))
* replace deprecated MarkdownRenderer.renderMarkdown with render (TD-1, fixes [#9](https://github.com/MMoMM-org/obsidian-dynbedded/issues/9)) ([cf4d4f4](https://github.com/MMoMM-org/obsidian-dynbedded/commit/cf4d4f41c4efa2c42e60f615ef31567a1d567389))


### Features

* add headerHierarchy flag to include subheadings in section embeds ([#2](https://github.com/MMoMM-org/obsidian-dynbedded/issues/2)) ([967cfbd](https://github.com/MMoMM-org/obsidian-dynbedded/commit/967cfbd037492890bd6f7fe5df0a02755f4538f4))
* add silent mode setting to suppress error display ([#8](https://github.com/MMoMM-org/obsidian-dynbedded/issues/8)) ([0a08eaa](https://github.com/MMoMM-org/obsidian-dynbedded/commit/0a08eaa24ba89bc3ba5b6f2367f45034f21f29f6))
* support dynamic date tokens in header references ([#7](https://github.com/MMoMM-org/obsidian-dynbedded/issues/7)) ([b8fe4b7](https://github.com/MMoMM-org/obsidian-dynbedded/commit/b8fe4b7770bfff823d334114389495caa5d6de8f))

# 1.0.0 (2022-10-30)


### Bug Fixes

* refactored DynbeddedProcessor.ts and fixed some issues ([3249154](https://github.com/MMoMM-org/obsidian-dynbedded/commit/3249154c81df20b5268d39f4e5c4c6992c3da35f))
* trying to get the build script to work correclty, without building locally. ([43b7f5d](https://github.com/MMoMM-org/obsidian-dynbedded/commit/43b7f5d1d90ef76db5daa71f8b07eaa14aabbba5))
* will postversion fix the issue? ([3e46b4b](https://github.com/MMoMM-org/obsidian-dynbedded/commit/3e46b4bd1c7cf0b57f8d1d883190a845c0273571))


### Features

* Initial Commit ([f67c68c](https://github.com/MMoMM-org/obsidian-dynbedded/commit/f67c68c04b8ac991c95da3c9726296218fba056a))

## [1.0.2](https://github.com/MMoMM-org/obsidian-dynbedded/compare/1.0.1...1.0.2) (2022-10-30)


### Bug Fixes

* trying to get the build script to work correclty, without building locally. ([43b7f5d](https://github.com/MMoMM-org/obsidian-dynbedded/commit/43b7f5d1d90ef76db5daa71f8b07eaa14aabbba5))

## [1.0.1](https://github.com/MMoMM-org/obsidian-dynbedded/compare/1.0.0...1.0.1) (2022-10-30)


### Bug Fixes

* refactored DynbeddedProcessor.ts and fixed some issues ([3249154](https://github.com/MMoMM-org/obsidian-dynbedded/commit/3249154c81df20b5268d39f4e5c4c6992c3da35f))

# 1.0.0 (2022-10-21)


### Features

* Initial Commit ([f67c68c](https://github.com/MMoMM-org/obsidian-dynbedded/commit/f67c68c04b8ac991c95da3c9726296218fba056a))
