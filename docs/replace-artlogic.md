# Move the gallery record from Artlogic

The base imports artworks and contacts from Artlogic CSV exports. Use a fresh data directory for your gallery, not the demo directory. Keep Artlogic available until counts and balances reconcile.

## Export and import

Artlogic documents exports under Artworks > Create > Export and Contacts > Create > Export in its [data export guide](https://support.artlogic.net/hc/en-gb/articles/360008495160-Management-System-data-export-options). CSV and Excel exports are available. For an Excel file, save the required sheet as UTF-8 CSV first. Export all records you need, not just the current filtered selection.

Artlogic's [artwork export guide](https://support.artlogic.net/hc/en-gb/articles/360020534099-How-to-export-artwork-details-images-and-image-filenames-to-excel) describes selecting fields and exporting image filenames. Download image files separately with its Chrome extension. This importer retains filenames but does not copy or fetch image files.

```bash
npm run migrate
node scripts/gallery.mjs import artlogic --artworks=artworks.csv --contacts=contacts.csv --dry-run
node scripts/gallery.mjs import artlogic --artworks=artworks.csv --contacts=contacts.csv
node scripts/gallery.mjs stocktake
node scripts/gallery.mjs contacts
```

Choose the matching columns in the custom export. Artlogic exports are configurable, so compare your headings against this mapping before the test run. examples/artlogic-artworks.csv and examples/artlogic-contacts.csv are synthetic fixtures with supported headings, not exports from a customer account.

| Record | Recognised headings | Behavior |
|---|---|---|
| Artwork key | Stock number, Stock no, Artwork ID, ID | Required stable key, updates on repeat import |
| Identity | Title or Artwork title; Artist or Artist name | Required; artist names match without case |
| Description | Medium, Dimensions, Year or Date, Provenance, Images or Image filenames | Preserved on artwork |
| Price | Retail price, Price or Selling price; Currency or Price currency | Decimal price without symbol, explicit three-letter currency required; missing price becomes zero |
| Position | Status or Availability; Location | Available, For sale, Reserved, On reserve, Sold, Returned, Not for sale; unknown values rejected |
| Collector key | Contact ID or ID | Required stable key |
| Collector name | Name, Full name, or First name plus Last name | Required |
| Collector email | Email or Email address | Stored as text |

Not for sale maps to reserved so the work is not listed as freely available. Review this mapping for your collection. Duplicate IDs in a file and malformed prices fail loudly. All input validates before the import transaction. Re-import updates artwork descriptions and prices and collector names and emails, but preserves local status, location and consent so it cannot reopen a sold work. Raw artwork columns are retained for later mapping. Existing artists' countries are preserved; newly imported artists have country Unknown until reviewed.

## What needs a separate mapping

Consignment contracts, invoices, account entries, tax, receipts, artist settlements, offers, notes, exhibitions, custom relationships, permissions, editions and image binaries do not come across in this base import. A sold artwork does not recreate its invoice. Reconcile those records separately before using financial reports. Enterprise DNA includes this mapping in a scoped migration. The import promises an artwork and contact starting point, not a complete financial cutover in a day.

## Reconcile and keep a backup

Compare artwork and contact counts, every stock identifier, status, currency and asking price against the original exports. Inspect a few artists with similar names. Enter contract references and live balances from signed and reconciled records. Run compliance and the week view. Export a private JSON snapshot with `node scripts/gallery.mjs export --out=gallery-backup.json`. It contains all ten domain record types but is not a database restore command. Keep the original exports and downloaded images. Agree the cutover only after the gallery accepts the results.
