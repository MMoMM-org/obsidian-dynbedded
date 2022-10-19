
# Example Dynamic Content

## Dataview
Show Incoming Links of this Note
```dataview
LIST FROM [[]]
```

# Default Embedded

# ! [[Dataview Note]]

Show [[Dataview Note]] as normal embedded which will display the incoming links to the [[Dataview Note]] note.

![[Dataview Note]]

# Dynbedded Feature

## Simple Dynbedded Usage

### dynbedded  [[Dataview Note]]
Show [[Dataview Note]] via dynbedded which will display the incoming links to THIS note.

```dynbedded
[[Dataview Note]]
```

## Advanced Dynbedded Usage

### dynbedded  [[Dataview Note#This also works]]
Show [[Dataview Note#This also works]] via dynbedded.

```dynbedded
[[Dataview Note#This also works]]
```

## dynbedded [[A note with 3 Headers and some checkboxes#Header 1]]
dynbedded works with Headers!
```dynbedded
[[A note with 3 Headers and some checkboxes#Header 1]]
```

## dynbedded [[A note with 3 Headers and some checkboxes#Header 2]]
dynbedded works with Headers!
```dynbedded
[[A note with 3 Headers and some checkboxes#Header 2]]
```


### dynbedded [[A note with 3 Headers and some checkboxes]]
dynbedded works without Headers but not with checkboxes (trust me 😢  neither with headers)

```dynbedded
[[A note with 3 Headers and some checkboxes]]
```

## Error Behaviour

### dynbedded [[A note with 3 Headers and some checkboxes#Header 4]]
Error Message because Header Part 4 is not found
```dynbedded
[[A note with 3 Headers and some checkboxes#Header 4]]
```

# dynbedded [[NotAMarkdownFile.jpeg]]
Error Message for wrong file extension
```dynbedded
[[NotAMarkdownFile.jpeg]]
```

# dynbedded [[ThisNoteDoesNotExist]]
Error Message for note not found

```dynbedded
[[ThisNoteDoesNotExist]]
```