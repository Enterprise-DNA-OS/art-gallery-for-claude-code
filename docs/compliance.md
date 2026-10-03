# Gallery record checks

Sources checked 2026-10-03. These checks identify missing records and review work. They are not a complete compliance assessment.

## Australian resale reporting

The [Office for the Arts](https://www.arts.gov.au/funding-and-support/resale-royalty-scheme) describes a 5% royalty on eligible commercial resales at AUD 1,000 or more. Galleries report resales to Copyright Agency, which determines eligibility. The [Copyright Agency guide](https://www.resaleroyalty.org.au/ART_MARKET_QUICK_GUIDE_2025.pdf) also requires attention to acquisition date, artist nationality and the period after death. A price threshold alone does not establish liability.

The royalties view marks an Australian resale in AUD at or above 100000 cents for reporting review and displays 5% as an indicative amount only. Foreign-currency Australian resales require conversion review. The compliance command flags every unreviewed resale, even when the threshold check alone finds nothing. Record an acknowledgement or reasoned determination with royalty-review. Neither reporting nor payment happens here.

The [New Zealand scheme](https://www.mch.govt.nz/our-work/arts-sector/artist-resale-royalty-scheme) and other jurisdictions require manual scheme review. No Australian threshold is applied to them. This release does not implement the NZ eligibility calculation or submission workflow.

## Consignment agreements

[NAVA commercial gallery guidance](https://code.visualarts.net.au/selling-and-marketing/commercial-galleries-and-representation/summary-of-good-practice-recommendations) recommends written terms including commission and payment arrangements. The application checks an agreement reference and recorded sale period. This is a record check against good practice and your contract, not a claim that NAVA is legislation. The sale command refuses a missing agreement or a sale outside that period. It cannot verify a signature or read the contract.

## House rules

- Condition checks older than 90 days prompt a fresh inspection. This interval is configurable gallery policy, not law.
- Artist settlements are recorded only after the collector balance is fully paid. Adjust for actual contract terms before use.
- Artist amounts use the agreed commission percentage of the recorded sale amount. This release does not calculate GST, tax invoices or accounting adjustments.
- Collector drafts include only recorded marketing permission. Import never assumes that permission. No message is sent.

Artwork provenance, ownership, authenticity, sanctions, privacy, cultural permissions, tax and copyright need their own review. No command labels the gallery compliant.
