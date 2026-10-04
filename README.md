# Art Gallery for Claude Code

The open-source commercial gallery record: artworks, artists, consignments, collectors, sales and exhibitions in a database you own. Built by Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Follow the quick start. | Your fields, rules, Artlogic migration and optional interface. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=artlogic). | Installed, connected and operated through **Omni by Enterprise DNA**. One setup fee, then a retainer. [How it works](https://enterprisedna.co/omni/instead-of/artlogic?utm_source=github&utm_medium=readme&utm_campaign=artlogic). |

## Quick start

Node 20 or later, Windows or Linux. No database installation needed for the demo.

```bash
git clone https://github.com/Enterprise-DNA-OS/art-gallery-for-claude-code.git
cd art-gallery-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
```

Open the folder in your coding agent and ask for /weekly-review. The fictional gallery has an expired consignment, a missing agreement, an overdue collector balance, a fully collected sale awaiting artist settlement, stale condition checks and an Australian resale awaiting review. All dates move with the day you seed it. The demo includes two currencies so a mixed total cannot masquerade as a cash balance.

## What this covers

The five weekly rituals are the stocktake, consignment review, collector follow-ups, artist settlements and exhibition checklist. Commands also record offers, sales, receipts, movements, condition inspections and collector notes. A sale requires a current written agreement reference. Duplicate sales and overpayments are refused. Receipts and artist payments are records only: no money moves. Documents are working records, not tax invoices.

Artwork and collector exports from Artlogic import in one command after a dry run. Financial history, media files and agreements need separate reconciliation. Read [the switching guide](docs/replace-artlogic.md) for exact mappings and limits. Images remain files you manage separately.

## Commands

- `/attention`: The decisions needing attention, with the reason for each.
- `/stocktake`: The location and condition record for every work.
- `/artworks`: Inventory with status, asking price and provenance.
- `/artists`: The represented artist list.
- `/contacts`: Collector details and permission records.
- `/consignments`: Consignment expiry and agreement references.
- `/settlements`: Collector balances and artist amounts still owed.
- `/sales`: Sale records and recorded receipts.
- `/offers`: All open offers and next follow-up dates.
- `/followups`: Collector follow-ups due today or overdue.
- `/exhibitions`: The exhibition calendar and count of works.
- `/movements`: Where each work moved and why.
- `/royalties`: Resale reporting review and evidence.
- `/compliance`: Agreement and resale review checks, with source links.
- `/questions`: Ten combined questions answered from the records.
- `/artist`: Artist
- `/artwork`: Artwork
- `/contact`: Contact
- `/add`: Add
- `/offer`: Offer
- `/sale`: Sale
- `/receive`: Receive
- `/settle`: Settle
- `/move`: Move
- `/condition`: Condition
- `/log`: Log
- `/hang`: Hang
- `/royalty-review`: Royalty review
- `/import`: Import
- `/export`: Export
- `/draft-followups`: Draft followups
- `/weekly-review`: Weekly review
- `/customise`: Customise
- `/new-view`: New view


Every command recipe lives in .claude/commands. AGENTS.md points other runtimes to the same instructions. `node scripts/gallery.mjs --help` lists arguments. Reads default to aligned text and accept --json. References accept a stock code, case-insensitive name or ID prefix; ambiguous names list candidates and exit 1.

## Ten questions to ask across your records

These are demonstrated queries, not a claim that Artlogic lacks all equivalent reports. Each is answered by `node scripts/gallery.mjs questions --question=N`:

1. Which expiring consignments have an overdue collector follow-up?
2. How much is ready for each artist, and how much are collectors still paying?
3. Which works on exhibition have an old or missing condition check?
4. Which unsold works are missing the consignment agreement reference?
5. Which available works have not had a collector offer in the last month?
6. Which Australian resales still need reporting review?
7. Which collectors need follow-up but have no marketing permission?
8. Which artists have the most unsold value at each location?
9. Which reserved works have an overdue viewing follow-up?
10. What collector balances and artist liabilities remain by currency?

## Your first hour: ten things to ask for

1. Show the gallery's attention list and explain each decision.
2. Which consignments end in the next fortnight?
3. Show Tidal Study's record and movements.
4. Record a condition inspection supplied by me.
5. Move Night Crossing to the viewing room.
6. Read Alex Morgan's collector notes before drafting a reply.
7. Show artist settlements, separating AUD and NZD.
8. Render the Coast and Country exhibition price list.
9. Test our Artlogic export and show what will not carry over.
10. Add a storage-rack field and a stocktake view through /customise.

## Documents and views

Set business_name, logo_path and colours in brand.json. Use an absolute image path or URL for a logo. `npm run docs` creates artist statements, condition records and exhibition checklists in docs-out. `npm run view` creates week, stock and money pages in views. Open the HTML and print to PDF when required. These files contain private information. Nothing is hosted or sent. Read [why there is no front end](docs/why-no-front-end.md).

## Rules and boundaries

[Compliance notes](docs/compliance.md) cite Australian resale guidance and NAVA contract practice. Royalty amounts are indicative, with eligibility left to the scheme administrator. New Zealand resale records are flagged for manual review. Condition intervals and settlement timing are house rules. The base covers consigned individual works, not edition inventory, owned-stock accounting, a public website or tax processing.

## Your own data

Use a fresh DATA_DIR and run migrate without seed. For a shared Postgres database set DATABASE_URL in the environment or an ignored .env file and run npm run migrate. Dates stay in UTC calendar form. The same migrations run in PGlite and Postgres. Production hosting, user permissions, backup schedules and image storage require configuration. Never run two local processes against the same embedded directory.

Export all ten domain record types with `node scripts/gallery.mjs export --out=private-backup.json`. The destination must be new, preventing accidental overwrites. This is an exchange snapshot, not a restore command. Keep native database backups and image files too.

## Validation

npm test uses temporary data and output directories and ignores DATABASE_URL. The explicit TEST_DATABASE_URL override is only for a disposable CI database. It checks migration and seed repeatability, every read, sale and money guards, ambiguous names, imports, drafts and document generation. GitHub Actions runs the same suite on Windows and Linux with Node 22, plus a separate Postgres check. Local execution evidence is in docs/validation.md.

## License

MIT. Copyright 2026 Enterprise DNA. Artlogic is named for compatibility and comparison. No affiliation or endorsement is implied.
