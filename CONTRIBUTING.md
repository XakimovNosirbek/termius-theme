# Contributing

Thanks for helping improve Termius Theme.

## How the theme is built

- `src/palettes.mjs` holds every colour for every variant. This is the only file you normally edit.
- `src/theme.mjs` maps palette roles to VS Code workbench keys, TextMate scopes and semantic tokens.
- `themes/*.json` are generated. Do not edit them by hand: CI fails when they differ from the generator output.

## Workflow

1. `npm install`
2. Change `src/palettes.mjs` or `src/theme.mjs`.
3. `npm run build`, then press `F5` to try the change in an Extension Development Host.
4. `npm run check`. Every syntax colour must reach 4.5:1 against the editor background. Comments and punctuation must reach 3.5:1.
5. If the change is visible, run `npm run preview` and commit the updated images.
6. Add a line under `## [Unreleased]` in `CHANGELOG.md`.

## Reporting a colour problem

Open an issue with:

- the variant name,
- the language and a short code sample,
- the scope, from **Developer: Inspect Editor Tokens and Scopes**,
- a screenshot.
