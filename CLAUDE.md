# Instructions for Claude working in this repository

Jaeyong Rhee's personal website. GitHub Actions builds it from `content/` and `media/` into `_site/` and publishes it to GitHub Pages. Nobody edits `_site/` by hand.

## Folders
- `content/*.json` — all text. Every text field is `{ "en": "...", "ko": "..." }`.
- `media/` — research figures, the hero photo, the portrait and logos (the build makes web sizes and strips metadata).
- Certificate, award, scholarship, activity and news photos are NOT here: they live in the private `jyongrhee/photos` repository (see `docs/photos-plan.md`).
- `engine/` — the build (Node). `hull/` — styles, scripts, fonts. Touch these only when asked for a design or feature change.

## Content updates (the usual request)
- Edit only `content/*.json` and add files under `media/`.
- Always fill both `en` and `ko`. Natural, plain Korean; no stiff or AI-sounding phrasing. English as a native speaker would write it.
- Every item in `honors.json`, `activities.json` and `news.json` has an `id`: lowercase-with-dashes, date first, unique in its file (e.g. `2026-07-best-thesis`). Photos are linked by it, so do not change an id once it has a photo.
- Dates are `YYYY` or `YYYY-MM`. Awards, scholarships, papers and news sort by date automatically; activities show in file order (newest at the top).
- Where things go:
  - Research → `research.json` (one item = one research page at `/research/<id>/`; `id` is lowercase-with-dashes). Chapters take `text` or `steps`, and an optional `figure`. `"pin": true` puts a study first.
  - Papers and talks → `publications.json` (`type`: journal | international | domestic). Link to a study with `"research": "<id>"`. If only a DOI is given, look the paper up and fill title / authors / venue / date; put the DOI without `https://doi.org/`.
  - Awards and scholarships → `honors.json` (`type`: award | scholarship; awards need `tier`: grand | top | excellence | honor). `"news": true` also lists it under News.
  - Activities → `activities.json` (`type`: activity). Certificates and course completions → same file, `type`: certificate.
  - News → `news.json`.
  - Funded projects → `projects.json`.
- Research figures: save under `media/research/` with a short dated name and set `figure.src` to that path. Anything committed here stays in the public history forever: shrink it below 1 MB and strip metadata first (`npm run check` blocks GPS data).
- Award, scholarship, activity, certificate and news photos go to the private photos repository as `<folder>/<id>.jpg` (folders: honors, scholarships, activities, certificates, news); leave `image` empty and the build links them by id. Crop or mask student ID, birth date, serial numbers and scholarship amounts first. On the site: awards and scholarships show the whole document in their tile, activities and certificates a small picture at the end of the row, news the newest item as a large card and the rest as small pictures. Every photo opens large on click.
- Hero photo: replace `media/hero.jpg` (landscape, 1600 px wide or more). The hero shows no place, coordinates or date; do not add `caption`, `coords` or `date` back unless the owner asks. Portrait: `media/profile.jpg` (3:4).

## Photo registration (awards, certificates, activity photos)
- The design is in `docs/photos-plan.md`; read it before any photo work. The photos repository is checked out next to this one (e.g. `/home/user/photos`); if the session does not have it, ask the owner to add `jyongrhee/photos` to the session.
- When the owner sends a photo or scan to register, first reply in Korean: "사진 처리 작업입니다. 모델을 Sonnet으로 바꾸셨나요?" Wait for the answer before doing anything on GitHub.
- Strip EXIF/GPS before a photo goes anywhere, read the certificate, and show a confirmation table (type, tier, title en/ko, org en/ko, date, id). Never guess what the certificate does not say clearly.
- After the owner says OK: push the prepared photo to the photos repository's `main` (that repository is a data store, so direct pushes there are fine), then put the text in this repository through a PR and merge it once checks pass (no second "합칠까요?" for photo registrations). If only a photo changed and no text, run the "Build and publish" workflow instead (workflow_dispatch). If the owner says "수정해", show the preview and ask before merging that one.

## After enrolment (March 2027)
When the owner says so: set `"marks": "kaist"` in `profile.json`. This switches the top bar to KAIST | BSL and shows the lab on the KAIST education line. Change the KAIST education `status` only if asked. Do not add the lab name or battery research claims anywhere else unless the owner asks.

## Never publish
Phone numbers, home address, birth date, student or military ID numbers, scholarship amounts, personal email addresses, unpublished results. `npm run check` blocks most of these, but do not rely on it.

## Before committing
1. `npm run check` — fix everything it reports as an error.
2. Show the owner the exact entries you added or changed (both languages) and wait for approval.
3. Commit with a short message such as `content: add 2027 KSME best paper award`. Pushing to `main` publishes the site in 1–2 minutes.
4. Never push to main. After pushing the branch and opening the PR, wait for the owner to check the preview, then ask whether to merge, noting that merging was originally the owner's job (in Korean: "합칠까요? (원래는 직접 하시던 일입니다)"). Merge the PR only when the owner says to merge that PR; otherwise the owner merges.

## Design or feature changes
Only when explicitly asked. Run `npm run build` and `npm run audit` afterwards; keep Lighthouse accessibility at 100 and performance at 90 or above. Asset file names are fingerprinted automatically; there is no version number to bump.
