# Context Explorer: content template

One copy of this file per book of the Bible, named for example `romans.md`. Fill in every section you can. Leave a section out rather than guess.

## Rules

1. Every claim carries exactly one **label**:
   - **Widely agreed**: accepted across traditions and by most scholars.
   - **Scholarly estimate**: a reasoned dating or attribution with a range.
   - **Debated**: serious scholars disagree. Say what the main positions are.
   - **Inferred**: reasoned from the text, not stated in it.
2. Every claim names at least one **source** (a book, article or commentary, with author and year).
3. Do not copy text from a copyrighted commentary. Summarise in your own words.
4. Mark who reviewed it and when. Unreviewed content is never shown to users.

## Template

```yaml
book: ROM
reviewed_by: ""        # name and role
reviewed_on: ""        # yyyy-mm-dd

author:
  claim: "Paul the apostle"
  label: Widely agreed
  sources: ["Author, Title, Year"]

date:
  claim: "About AD 57"
  label: Scholarly estimate
  range: "AD 55 to 58"
  sources: []

setting:
  place_written: { claim: "", label: "", sources: [] }
  audience:      { claim: "", label: "", sources: [] }
  occasion:      { claim: "", label: "", sources: [] }

people:
  - name: ""
    role: ""
    label: ""
    sources: []

timeline:
  - when: ""
    event: ""
    label: ""
    sources: []

debated_points:
  - question: ""
    positions:
      - view: ""
        held_by: ""        # traditions or scholars, described fairly
    sources: []
```
