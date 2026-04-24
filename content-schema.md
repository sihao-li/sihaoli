# Content Schema

Edit JSON files in `src/data`, then run:

```bash
npm run build
```

## `profile.json`

Core identity and homepage data: name, title, affiliation, description, emails, links, portrait, CV, research themes, and conference focus or upcoming presentations.

## `publications.json`

Each item supports:

- `id`: stable slug-like identifier.
- `type`: `thesis`, `working_paper`, `work_in_progress`, `master_thesis`, `journal_article`, or `conference_paper`.
- `maturity`: `working-paper`, `work-in-progress`, `published`, or `thesis-archive`.
- `typeLabel`, `title`, `authors`, `year`, `status`.
- `theme`: public academic area shown in the research dossier.
- `researchQuestion`: optional internal/public summary field, not foregrounded in the publication cards.
- `abstract`: optional, shown behind a disclosure.
- `image`: optional local path.
- `links`: optional object with `paper`, `pdf`, `code`, `data`, `slides`, or `video`.
- `featured`: show on homepage.
- `conferenceSelected`: show in conference mode.

Use “To specify before publication” when a public summary would overstate an unfinished project.

## `talks.json`

Each item supports:

- `year`, `dateLabel`, `title`, `location`.
- `city`, `country`, `lat`, `lng` for the world map.
- `url`, `eventType`, `paperPresented`.

The SVG map positions points from latitude/longitude. For repeated cities, points are slightly offset automatically.

## `teaching.json`

Fields:

- `period`
- `institution`
- `course`
- `level`
- `status`: `Current` or `Past`

## `tutorials.json`

Fields:

- `id`, `title`, `date`, `language`, `category`, `summary`, `url`.
- `source`: local Markdown source for generated long tutorials.
- `dataset`: local CSV path for static data visualizations.
