# Obsidian Plugin Base

A default plugin structure which can be used to create Obsidian plugins.



## What is the plugin all about


## Obsidian Users

### Installing via BRAT

You can install this plugin via BRAT as long as it is not officially available.

For more information on BRAT and how to install this plugin take a look here:
https://github.com/TfTHacker/obsidian42-brat#Quick-Guide-for-using-BRAT


### Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` from the build directory to your vault `VaultFolder/.obsidian/plugins/obsidian-plugin-base/`.

## Developers

### Dependencies

- esbuild-plugin-copy https://nx-plugins.netlify.app/derived/esbuild.html#copy
- semantic-release (and GitHub Actions) for more information see https://github.com/semantic-release/semantic-release
- [HotReload](https://github.com/pjeby/hot-reload) (Already included in the test-vault)

### Usage

#### Prepare Development

- Rename test-vault in your Git Repo to something you like
- Rename obsidian-plugin-base in your Git Repo test-vault/.obsidian/plugins to your plugin id
  - if you create a new folder make sure that it contains a .hotreload file
- Change TEST_VAULT in esbuild.dev.config.mjs to reflect the name to your Test Vault
- Change PLUGIN_ID in esbuild.dev.config.mjs to reflect the name to your plugin
- Run the dev version of esbuild in debug mode to watch changes to files and autodeploy to the Test Vault
- [Setup GitHub Actions for Obsidian Release](https://marcus.se.net/obsidian-plugin-docs/publishing/release-your-plugin-with-github-actions)
- [Setup GitHub Actions for Semantic-Release](https://github.com/semantic-release/semantic-release/blob/master/docs/recipes/ci-configurations/github-actions.md


#### Development

- Your commit messages need to be based on the [ESLint Convention](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-eslint)
- Every push to master will trigger a release!!! [Take a look here for more information and why you should do it this way](https://github.com/semantic-release/semantic-release/blob/master/docs/support/FAQ.md#is-it-really-a-good-idea-to-release-on-every-push)
ToDo: ???


#### Release
[![semantic-release: eslint](https://img.shields.io/badge/semantic--release-eslint-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

- If you want to push a release.... 
  - merge your development branch into the master and push [Take a look here for more information and why you should do it this way](https://github.com/semantic-release/semantic-release/blob/master/docs/support/FAQ.md#is-it-really-a-good-idea-to-release-on-every-push)
  - versions should be automatically updated and a release should be bundled

## ToDo

- Implement Beta Builds for BRAT via https://github.com/semantic-release/semantic-release/blob/master/docs/recipes/release-workflow/pre-releases.md#publishing-pre-releases
- 