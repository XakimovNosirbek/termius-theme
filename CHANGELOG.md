# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Flat Termius layout: side bar, tab strip, title bar and status bar share the editor background; tabs are raised `#202436` cards with gaps, as in the Termius app.

## [1.0.0] - 2026-11-24

### Added

- Three variants: **Termius Dark**, **Termius Midnight** and **Termius Light**.
- More than 500 workbench colours per variant, including the merge editor, testing, debugging, notebooks, chat and the source control graph.
- The Termius Dark 16-colour terminal palette with green terminal text.
- 75 TextMate token rules and semantic highlighting.
- A generator (`npm run build`) that produces every theme from one palette file.
- A quality gate (`npm run check`) for colour syntax, `package.json` wiring and WCAG contrast.
- README screenshots and the icon, rendered from the palettes (`npm run preview`).
- CI that checks every change, plus a release workflow that publishes tagged versions.

[Unreleased]: https://github.com/XakimovNosirbek/termius-theme/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/XakimovNosirbek/termius-theme/releases/tag/v1.0.0
