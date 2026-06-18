# Range, inline, attribution & quoth tests

Source note: [[Quoth Source]] (has `# Intro`, `# Schedule`, `# Footer`).

## 1. after: anchor → end of file
Expect: the Schedule list, then `# Footer` + its text. NOT the intro.

```dynbedded
[[Quoth Source]]
after: "# Schedule"
```

## 2. from / to range (inclusive)
Expect: from `# Schedule` through `# Footer` line inclusive.

```dynbedded
[[Quoth Source]]
from: "# Schedule"
to: "# Footer"
```

## 3. #header section (existing behaviour — stops at next heading)
Expect: only the Schedule list (stops before `# Footer`).

```dynbedded
[[Quoth Source#Schedule]]
```

## 4. inline display
Expect: the Schedule section flowing inline (no block paragraph margins).

```dynbedded
[[Quoth Source#Schedule]]
display: inline
```

## 5. attribution footer
Expect: the section, then "— Weekly Schedule, Marcus".

```dynbedded
[[Quoth Source#Schedule]]
show: title, author
```

## 6. Quoth compatibility
Enable **Render quoth blocks** in settings, reload, then this should render like #1.

```quoth
path: [[Quoth Source]]
ranges: after "# Schedule"
display: inline
```
