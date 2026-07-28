# Error link test (#39)

Every block below fails on purpose. In each error message the `[[target note]]`
should be clickable, and a link icon should follow the message when the target
file exists.

## 1. Header not found — link + icon

The main case: the note exists, the header does not.

```dynbedded
[[A note with 3 Headers and some checkboxes#No Such Header]]
```

## 2. File not found — muted link, no icon

Nothing to open, so no icon. The link is muted but still clickable and creates
the note, exactly like a native unresolved `[[link]]`.

```dynbedded
[[There Is No Such Note]]
```

## 3. Block reference not found — link + icon

```dynbedded
[[A note with 3 Headers and some checkboxes#^nosuchblock]]
```

## 4. Text anchor not found — link + icon

```dynbedded
[[A note with 3 Headers and some checkboxes]]
after: "this anchor does not exist"
```

## 5. Line out of range — link + icon

Positional anchors only exist in the Quoth syntax, so this one needs **Render
quoth blocks** enabled.

```quoth
path: [[A note with 3 Headers and some checkboxes]]
ranges: 9999:1 to 9999:5
```

## 6. Malformed block — plain text, no link

No target is known yet, so the message must stay plain text.

```dynbedded
[[unclosed link
```

## 7. Quoth message with literal brackets — plain text, no link

Only visible with **Render quoth blocks** enabled. The literal `[[...]]` in the
message must NOT turn into a link to a note called "...".

```quoth
display: embedded
```

## Checks

- Click the link text → target note opens in the current tab.
- Cmd/Ctrl-click the link text → target note opens in a new tab.
- Tab to the link, press Enter → target note opens.
- Click the icon → target note opens.
- **Enable silent mode** → every block above renders empty.
- **Show source link** off → successful embeds still have no icon; the error
  boxes above still do.
