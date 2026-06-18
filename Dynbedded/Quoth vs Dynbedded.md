# Quoth vs Dynbedded — fidelity comparison

Keep **Render quoth blocks OFF** in Dynbedded settings while Quoth is installed.
Then each pair below renders: the `quoth` block via **Quoth**, the `dynbedded`
block via **Dynbedded**. They should look identical. Differences = fidelity bugs
to fix in our parser/resolver.

Source: [[Quoth Source]] — has `# Intro`, `# Schedule` (a 3-item list), `# Footer`.

---

## A. `after "# Schedule"` → to end of file
Expect both: the Schedule list **and** `# Footer` + its text (NOT the intro).

Quoth:
```quoth
path: [[Quoth Source]]
ranges: after "# Schedule"
```

Dynbedded:
```dynbedded
[[Quoth Source]]
after: "# Schedule"
```

---

## B. Range `"# Schedule" to "# Footer"`
Open question Q3: is the `to` anchor (`# Footer` line) included?

Quoth:
```quoth
path: [[Quoth Source]]
ranges: "# Schedule" to "# Footer"
```

Dynbedded:
```dynbedded
[[Quoth Source]]
from: "# Schedule"
to: "# Footer"
```

---

## C. Heading subpath section
Open question Q5: does the heading line itself appear, and where does the
section end? Dynbedded `#header` stops at the next heading and excludes the
heading line; check whether Quoth matches.

Quoth:
```quoth
path: [[Quoth Source#Schedule]]
```

Dynbedded:
```dynbedded
[[Quoth Source#Schedule]]
```

---

## D. Inline display
Expect both: the Schedule content flowing inline, no block paragraph margins.

Quoth:
```quoth
path: [[Quoth Source]]
ranges: after "# Schedule"
display: inline
```

Dynbedded:
```dynbedded
[[Quoth Source]]
after: "# Schedule"
display: inline
```

---

## E. Source attribution
Compare how each renders title + author (frontmatter: Weekly Schedule / Marcus).

Quoth:
```quoth
path: [[Quoth Source#Schedule]]
show: title, author
```

Dynbedded:
```dynbedded
[[Quoth Source#Schedule]]
show: title, author
```

---

## F. Multi-range with join (Quoth reference only)
Native dynbedded has no multi-range key — this is here so you can record what
Quoth produces (join default `" ... "`) for when we verify our quoth parser
later (uninstall Quoth, enable Render quoth blocks).

Quoth:
```quoth
path: [[Quoth Source]]
ranges: "09:00 Standup" to "10:00 Deep work", "14:00 Review"
```
