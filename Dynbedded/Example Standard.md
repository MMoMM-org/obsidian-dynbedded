
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

## Corner Cases / Community Plugin support

### dynbedded [[A note with some Tasks]]
dynbedded works without Headers but not with tasks (trust me 😢  neither with headers)
```dynbedded
[[A note with some Tasks]]
```

## dynbedded [[A note with some Tasks]] via dataview
If you use Dataview on the other hand it also works with tasks 😀

```dynbedded
[[A note with some Tasks#Dataview]]
```

## dynbedded [[A Note with a Button]]
This also works 😀

```dynbedded
[[A Note with a Button]]
```

## dynbedded [[A Note with a Button#And another one]]

```dynbedded
[[A Note with a Button#And another one]]
```



## Header Hierarchy Example

### Without headerHierarchy (default)
Only content up to the next heading of any level is shown — subheadings are not included.

```dynbedded
[[A note with 3 Headers and some checkboxes#Section With Subheadings]]
```

### With headerHierarchy: true
Content up to the next heading of equal or higher level — subheadings are included.

```dynbedded
[[A note with 3 Headers and some checkboxes#Section With Subheadings]]
headerHierarchy: true
```

## Error Behaviour

### dynbedded [[A note with 3 Headers and some checkboxes#Header 4]]
Error Message because Header Part 4 is not found
```dynbedded
[[A note with 3 Headers and some checkboxes#Header 4]]
```

### dynbedded [[A note with an empty header#Header One]]
NO Error Message because the header is empty
```dynbedded
[[A note with an empty header#Header One]]
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

# dynbedded [[A Note with an Image]]

```dynbedded
[[A Note with an Image]]
```


# dynbedded [[A Note with an Image#Image]]

```dynbedded
[[A Note with an Image#Image]]
```
