# Obsidian Dynbedded
Embed snippets, templates and any linkable by delegating the current scope to the embedded file.

## Explanation:
Embeds the contents of file ***`Note with Dataview.md`***, existing in the active vault.
~~~
```dynbedded
[[Note with Dataview]]
```
~~~
This will then include the content of that note into the current note, and execute any dynamic content from the included note in the context of the current note.

As an example: a Dataview script to show inline links
```dataview
LIST FROM [[]]
```
will show the inline links of the current note, not the inline links of the note you are embedding.

# Features:

## Embedded other notes

Notes can be embedded and will execute any dynamic content from the context of the active note.
You can also use Headers in the embedded.

e.g.
~~~
```dynbedded
[[Note with Dataview#Header is possible too]]
```
~~~

which will only show the content of the "Header is possible too" section.

## Current Date substitution of note names

### Date Formatting 📅

You can substitute part of the note name with the current date in any format you like [based on Moment.js Date format](https://momentjs.com/docs/#/displaying/format/).

e.g.
~~~
```dynbedded
[[{{YYYY-MM-DD}}#Header is possible too]]
```
~~~

will embed the content of the "Header is possible too" section of the note with a name of the current date in "YYYY-MM-DD" format, e.g 2022-10-14

### Flexible Date 🚀📆

You can also change the date to be used by "adding" a specific duration to the actual date, either as
- Number (positive or negative) "of days"
- String based on ISO8601 format for example, **```P-1D```**, [for more information click here](https://en.wikipedia.org/wiki/ISO_8601#Durations ]

e.g.
~~~
```dynbedded
[[{{YYYY-MM-DD|P-1D}}#Header is possible too]]
```
~~~
will return the section of the note from "yesterday" starting with header "#Header is possible too"


## Examples

If you want to see more examples take a look into the Test Vault under [Dynbedded](https://github.com/MMoMM-Marcus/obsidian-dynbedded/blob/23bcc02cbafa1d6865a3b677c094388368d1b6a6/Dynbedded) in this repository.

You can also read more about the plugin on my website:

https://www.mmomm.org/ path to (English Version)
https://www.mmomm.org/ path to (Deutsche Version)

Or if you are more the Video type of person take a look at the following video examples:

Youtube link (English version)
Youtube ling (Deutsche Version


## Limitations

There are some limitations to the plugin (some might be overcome in the future, some not.)
- Checkboxes are displayed and can be checked but this is only fake. The original checkboxes are not checked!
- The links inside the code-block are NOT links, so if you rename your note the connection breaks.


## Styling

You can style the embedded content with a style sheet. The following styles are available:

- .dynbedded-error = for error messages, by default red. See [styles.css](https://github.com/MMoMM-Marcus/obsidian-dynbedded/blob/23bcc02cbafa1d6865a3b677c094388368d1b6a6/styles.css))
- .dynbedded = for the normal display. There is no default value for this at the moment.

# Installing:

## Installing via Obsidian Plugin

Todo: add steps to install

## Installing via BRAT

You can install this plugin via BRAT as long as it is not officially available.

For more information on BRAT and how to install this plugin take a look here:
https://github.com/TfTHacker/obsidian42-brat#Quick-Guide-for-using-BRAT


## Manually installing the plugin

Copy over `main.js`, `styles.css`, `manifest.json` from the build directory to your vault `VaultFolder/.obsidian/plugins/obsidian-dynbedded/`.


# Developers

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