---
name: test-ui-variations
description: Test an AIRI UI component against five content and theme axes, which are language, text length, image color, theme hue, and color mode. Use when you design, compare, or review a component that shows user content, for example a card, a list row, or a chat bubble.
---

# Test UI Variations

A component that looks correct with one sample can fail with real content. Test each axis before you tell the user that a design works.

## The Five Axes

| Axis | Fixtures to include | Typical failure |
| --- | --- | --- |
| Language | English, Simplified Chinese, Japanese, Korean, Arabic, and one long word without spaces | Clipped glyphs, wrong text direction, a transform that applies only to Latin letters |
| Text length | A short text, a text that needs three lines or more, and an empty text | Cut lines, a layout that moves, an empty hole |
| Image color | A dark image, a saturated image, a mostly white image, a transparent image, and an image with a different aspect ratio | Text that you cannot read, a tinted image, a bad crop |
| Theme hue | The default hue and three or more other hues | A color that does not follow the theme, a color that conflicts with the image |
| Color mode | Light and dark | A fixed color that disappears, a surface with no visible edge |

## Build the Test Page

- Put the fixtures in a devtools page or a story. Do not test in the production page.
- Show all fixtures at the same time. Give each fixture a different image and a different language.
- Do not repeat one image in every fixture. One image hides the image color axis.
- When you compare designs, keep each design as a separate row. Do not replace the previous design.
- When the user gives you private images, load them from a directory that Git does not track.

## Apply the AIRI Theme Controls

- To change the theme hue, set `--chromatic-hue` on `document.documentElement`. The derived chroma variables are computed there.
- When the page unmounts, restore the previous hue.
- To change the color mode, use `useTheme()` from `@proj-airi/ui`.

## Examine Each Axis

- For the language axis, examine the last glyph of each italic or slanted text. An overflow rule can clip it.
- For the language axis, examine Arabic alignment. Add `dir="auto"` when the text stays on the left.
- For the text length axis, compare the row height of all fixtures. The controls must stay aligned.
- For the image color axis, examine each translucent layer on the white image and on the dark image.
- For the theme hue axis, use opaque images. A transparent sample image shows the theme color behind it.
- For the color mode axis, examine the edge of each card against the page background.
- After you move a page file, restart the dev server. A stale route table can render the layout two times.

## Report the Results

- Give a table with one row for each axis and one column for each design.
- In each cell, write the result and the fixture that caused a failure.
- List each cell that you did not test. Do not report an axis as tested from one fixture.
- Include a screenshot for each failure. Take it from the page that the user can open.
