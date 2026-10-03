# Art Gallery for Claude Code: operating instructions

## Operator context

This starts with fictional Harbour Rooms Gallery demo records. Replace the business name in brand.json and record your actual operator, country and contract rules here before importing live records. Do not mix the demo with a live collection. Start live data in a fresh DATA_DIR and run migrate without seed.

## How to work

Read records before changing them. Dates are calendar dates. Money is integer cents with an explicit currency. Keep AUD and NZD totals separate. No email, publishing, banking, card charges or submissions are implemented. A receipt or settlement is a record of a payment made elsewhere. Ask for missing facts and never infer a signed agreement or consent. Names resolve case-insensitively and ambiguous names must be disambiguated.

## Routing

| Job | Command |
|---|---|
| Attention | `/attention` |
| Stocktake | `/stocktake` |
| Artworks | `/artworks` |
| Artists | `/artists` |
| Contacts | `/contacts` |
| Consignments | `/consignments` |
| Settlements | `/settlements` |
| Sales | `/sales` |
| Offers | `/offers` |
| Followups | `/followups` |
| Exhibitions | `/exhibitions` |
| Movements | `/movements` |
| Royalties | `/royalties` |
| Compliance | `/compliance` |
| Questions | `/questions` |
| Artist | `/artist` |
| Artwork | `/artwork` |
| Contact | `/contact` |
| Add | `/add` |
| Offer | `/offer` |
| Sale | `/sale` |
| Receive | `/receive` |
| Settle | `/settle` |
| Move | `/move` |
| Condition | `/condition` |
| Log | `/log` |
| Hang | `/hang` |
| Royalty review | `/royalty-review` |
| Import | `/import` |
| Export | `/export` |
| Draft followups | `/draft-followups` |
| Weekly review | `/weekly-review` |
| Customise | `/customise` |
| New view | `/new-view` |

## Files and data

- scripts/gallery.mjs is the single domain CLI. Use --help and --json.
- supabase/migrations holds append-only migrations. npm run migrate applies them transactionally.
- DATABASE_URL selects a team Postgres database. Otherwise DATA_DIR selects a local PGlite database. Never open the same local data directory from two processes.
- .claude/commands is the one job library for every agent runtime.
- drafts, views and docs-out are private generated output. Export files contain collector data and must be stored privately.
- docs/compliance.md separates cited checks from house rules. A resale flag is not a tax or legal determination.
- Current scope is consigned single artworks. Tax calculations, editions, owned-stock cost accounting, banking, website, marketplace and mobile integrations need separate implementation.
- Run npm test after changes. Never use the demo seed against live records. Never delete records without the operator's explicit instruction.

Built and run for businesses through Omni by Enterprise DNA.
