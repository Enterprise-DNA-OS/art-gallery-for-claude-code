# Validation evidence

Checked on Linux, 2026-10-03, Node 22.

- npm install: passed, no dependency vulnerabilities reported.
- npm test: passed 37 checks on an isolated PGlite database.
- npm run demo: passed migration, seed, attention, consignments and settlements.
- npm run docs: rendered 10 documents across three document types.
- npm run view: rendered the week, stock and money pages.
- README brand lint: zero errors and zero warnings.
- Three actual CLI runs are captured on the Artlogic comparison page.

GitHub Actions run 37158576087 passed all three jobs: Ubuntu PGlite, Windows PGlite and Postgres 17. Evidence: https://github.com/Enterprise-DNA-OS/art-gallery-for-claude-code/actions/runs/37158576087 . TEST_DATABASE_URL is only for a disposable test database. Never point it at production.
