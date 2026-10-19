# DGD Frontend — Two Independent TypeScript Apps

This repository contains two separate, independently runnable frontend projects built for the GDG Tech Wildcard briefs.

| Project | Brief | Palette | Directory |
| --- | --- | --- | --- |
| **Atelier Settings** | Multi-tab settings synchronization | Coffee + powder blue | [`apps/settings-sync`](apps/settings-sync) |
| **Folio · Formula Studio** | Spreadsheet with a custom formula engine | Blush pink + teal | [`apps/spreadsheet`](apps/spreadsheet) |

Each application has its own `package.json`, Vite configuration, source tree, documentation, and production build. There is no shared runtime code between them.

## Quick start

```bash
npm run install:all
npm run dev:settings       # http://localhost:5173
npm run dev:spreadsheet    # http://localhost:5174
```

Build both projects:

```bash
npm run build
```

## Repository layout

```text
apps/
  settings-sync/           Task 1 — standalone React + TypeScript app
  spreadsheet/             Task 2 — standalone React + TypeScript app
```

Detailed setup, architecture, and testing notes live in each app's README.
