# Instructions for Claude working in this repository

Jaeyong Rhee's personal website. GitHub Actions builds it from `content/` and `media/` into `_site/` and publishes it to GitHub Pages. Nobody edits `_site/` by hand.

## Folders
- `content/*.json` — all text. Every text field is `{ "en": "...", "ko": "..." }`.
- `media/` — photos and figures (originals; the build makes web sizes and strips metadata).
- `engine/` — the build (Node). `hull/` — styles, scripts, fonts. Touch these only when asked for a design or feature change.

## Content updates (the usual request)
- Edit only `content/*.json` and add files under `media/`.
- Always fill both `en` and `ko`. Natural, plain Korean; no stiff or AI-sounding phrasing. English as a native speaker would write it.
- Dates are `YYYY` or `YYYY-MM`. Awards, scholarships, papers and news sort by date automatically; activities show in file order (newest at the top).
- Where things go:
  - Research → `research.json` (one item = one research page at `/research/<id>/`; `id` is lowercase-with-dashes). Chapters take `text` or `steps`, and an optional `figure`. `"pin": true` puts a study first.
  - Papers and talks → `publications.json` (`type`: journal | international | domestic). Link to a study with `"research": "<id>"`. If only a DOI is given, look the paper up and fill title / authors / venue / date; put the DOI without `https://doi.org/`.
  - Awards and scholarships → `honors.json` (`type`: award | scholarship; awards need `tier`: grand | top | excellence | honor). `"news": true` also lists it under News.
  - Activities → `activities.json` (`type`: activity). Certificates and course completions → same file, `type`: certificate.
  - News → `news.json`.
  - Funded projects → `projects.json`.
- Photos: save under `media/honors|research|activities|news/` with a short dated name (e.g. `2027-05-ksme.jpg`) and set the item's `image` (or `figure.src`) to that path. Crop or mask student ID, birth date and serial numbers first. Landscape 4:3 is best for certificates.
- Hero photo: replace `media/hero.jpg`, then update `profile.hero.caption`, `coords` and `date`. Portrait: `media/profile.jpg` (3:4).

## After enrolment (March 2027)
When the owner says so: set `"marks": "kaist"` in `profile.json`. This switches the top bar to KAIST | BSL and shows the lab on the KAIST education line. Change the KAIST education `status` only if asked. Do not add the lab name or battery research claims anywhere else unless the owner asks.

## Never publish
Phone numbers, home address, birth date, student or military ID numbers, scholarship amounts, personal email addresses, unpublished results. `npm run check` blocks most of these, but do not rely on it.

## Before committing
1. `npm run check` — fix everything it reports as an error.
2. Show the owner the exact entries you added or changed (both languages) and wait for approval.
3. Commit with a short message such as `content: add 2027 KSME best paper award`. Pushing to `main` publishes the site in 1–2 minutes.

## Design or feature changes
Only when explicitly asked. Run `npm run build` and `npm run audit` afterwards; keep Lighthouse accessibility at 100 and performance at 90 or above. Asset file names are fingerprinted automatically; there is no version number to bump.
