# Obsidian Dynbedded
Embed snippets, templates and any linkable by delegating the current scope to the embedded file either by using a direct reference or as reference with date naming format relative from today.

![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22obsidian-dynbedded%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)

# Features

## Embedded other notes

Notes can be embedded and will execute any dynamic content from the context of the active note.
You can also use Headers in the embedded.

e.g.
~~~
```dynbedded
[[Note with Dataview#Pick any header level you like]]
```
~~~

This will then include the content of that note into the current note, and execute any dynamic content from the included note in the context of the current note.

As an example: a Dataview script to show inline links
~~~
```dataview
LIST FROM [[]]
```
~~~
will show the inline links of the current note, not the inline links of the note you are embedding.

![Dataview Inliks](images/40-01%20Dataview%20Inlinks.png)

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

Please Note 💡: You need to have the full note name inside the curly brackets, so if you want to use something like DP-2022-10-14 the  syntax looks like:

~~~
```dynbedded
[[{{[DP-]YYYY-MM-DD}}#Header is possible too]]
```
~~~

### Flexible Date 🚀📆

You can also change the date to be used by "adding" a specific duration to the actual date, either as
- Number (positive or negative) "of days"
- String based on ISO8601 format for example, **```P-1D```**, [for more information click here](https://en.wikipedia.org/wiki/ISO_8601#Durations)

e.g.
~~~
```dynbedded
[[{{YYYY-MM-DD|P-1D}}#Header is possible too]]
```
~~~
will return the section of the note from "yesterday" starting with header "#Header is possible too"

## Styling

You can style the embedded content with a style sheet. The following styles are available:

- .dynbedded = for the normal display. There is no default value for this at the moment. (This styling needs to be in front of the error Styling if you restyle both!)
- .dynbedded-error = for error messages, by default red. See [styles.css](styles.css)

After creating your own style sheet you need to copy it to the .obsidian/snippets folder and enable the style sheet in Appearance / CSS Snippets.

## Working with other plugins
Some plugins are just the perfect partner for Dynbedded, and were one of the reasons this plugin was created 😀
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) will not only be able to show information referenced from the current note (like the inlinks example) but will also allow you to work with Tasks! No Fake checking of Task boxes. It is the real thing.
- [Buttons](https://github.com/shabegom/buttons) also works quite well with Dynbedded, allowing you to create a "master note" with some reusable buttons.

## Examples

If you want to see more examples take a look into the Test Vault under [Dynbedded](Dynbedded) in this repository.

You can also read more about the plugin on my website:

- [MMoMM.org English Version](https://www.mmomm.org/en/post/obsidian-dynbedded)
- [MMoMM.org Deutsche Version](https://www.mmomm.org/post/obsidian-dynbedded)

Or if you are more the Video type of person take a look at the following video examples:

- [YouTube English version](https://youtu.be/pytz0KENhp8)
- [YouTube Deutsche Version](https://youtu.be/_0MooUB_sWQ)

## Limitations

There are some limitations to the plugin (some might be overcome in the future, some not.)
- Checkboxes are displayed and can be checked but this is only fake. The original checkboxes are not checked! The same is true for Tasks from the Tasks Plugin. See [Working with other plugins](#Working with other plugins) for a workaround.
- The links inside the code-block to embed the other notes data are NOT links, so if you rename your targeted note the connection breaks.
- Dynbedded will not search for content between Header Levels, it will search for content between headers, see [Issue #2](https://github.com/MMoMM-org/obsidian-dynbedded/issues/2)

## Possible P+1D features
PS: No, I won't deliver those features tomorrow 😀

- Automatic Refresh of Embeds
- Name of the day as relative dates, e.g. DWed for this week Wednesday
- Relative name of the day as relative dates, e.g. D-1Wed for last week Wednesday

# Installing

## Installing via Obsidian Community Plugins

Just install the plugin via the community plugin dialog as soon as it becomes available. After enabling you are ready to go.
At the moment there are no real settings available, only debug logging. (And a link to my Ko-Fi Support)

## Installing via BRAT

You can install this plugin via BRAT as long as it is not officially available or if you want to test beta versions (there is none at the moment, so let me know if you want to know when I make one)

For more information on BRAT and how to install this plugin take a look here:
https://github.com/TfTHacker/obsidian42-brat#Quick-Guide-for-using-BRAT


## Manually installing the plugin

Copy over `main.js`, `styles.css`, `manifest.json` from the [build](build) directory to your vault `VaultFolder/.obsidian/plugins/obsidian-dynbedded/`.

## Acknowledgement

Based on the general idea from [Dynamic Embed](https://github.com/dabravin/obsidian-dynamic-embed).