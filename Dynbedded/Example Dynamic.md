
# Example Dynamic Content

##  Dataview
Show Incoming Links of this Note
```dataview
LIST FROM [[]]
```

# Default Embedded

## ! [[{{YYYY-MM-DD}}]]

Show [[{{YYYY-MM-DD}}]] via dynbedded which will display the incoming links to the [[Dataview Note]] note **IF** an embedded would be able to use [[date substitution]]

![[{{YYYY-MM-DD}}]]

# Dynbedded Feature

## Simple Date Substituion Examples
More info about [[date substitution]] can be found in the Note: [[date substitution]] 😀


### dynbedded  [[{{YYY-MM-DD}}]]
Show [[{{YYYY-MM-DD}}]] via dynbedded-

```dynbedded
[[{{YYYY-MM-DD}}]]
```

### dynbedded  [[{{[DP-Y]YYY-MM-DD}}]]
Show [[{{[DP-]YYYY-MM-DD}}]] via dynbedded-

```dynbedded
[[{{[DP-]YYYY-MM-DD}}]]
```

###  dynbedded  [[{{YYYY-MM-DD}}#This also works]]
Show **This also works** section of [[{{YYYY-MM-DD}}]] via dynbedded.

```dynbedded
[[{{YYYY-MM-DD}}#This also works]]
```

### dynbedded  [[{{[DP-]YYYY-MM-DD}}#This also works]]
Show **This also works** section of [[{{[DP-]YYYY-MM-DD}}]] via dynbedded.

```dynbedded
[[{{[DP-]YYYY-MM-DD}}#This also works]]
```

## Advanced Date Substitution Examples
More info about [[date substitution]] can be found in the Note: [[date substitution]] 😀

### dynbedded  [[{{YYYY-MM-DD|-1}}]]
Show [[{{YYYY-MM-DD}}|-1]] **(Yesterday)** via dynbedded which will display the incoming links to THIS note .

```dynbedded
[[{{YYYY-MM-DD|-1}}]]
```

### dynbedded  [[{{YYYY-MM-DD|P-1D}}]]
Show [[{{YYYY-MM-DD}}|P-1D]] **(Yesterday)** via dynbedded which will display the incoming links to THIS note .

```dynbedded
[[{{YYYY-MM-DD|P-1D}}]]
```

### dynbedded  [[{{[DP-]YYYY-MM-DD|P-1D}}#This also works]]
And of course it also works with something like this!
Show **This also works** section of [[{{[DP-]YYYY-MM-DD|P-1D}}]] **(Yesterday)** via dynbedded.

```dynbedded
[[{{[DP-]YYYY-MM-DD|P-1D}}#This also works]]
```

## Error Behaviour

### dynbedded [[{{YYYY-MM-DD}}#Part4]]
Error Message because Header Part 4 is not found
```dynbedded
[[{{YYYY-MM-DD}}#Part4]]
```

### dynbedded  [[{{really not a date format}}]]
Moment.js is really forgiving while using custom date formating. Except to see a similar message most of the time if you mistype yourself in the format part.
```dynbedded
[[{{really not a date format}}]]
```

> There is also the following Error Message which could show up:
> "Not a valid Moment.js Time Format:
