# XRP Ledger DEX order book 'book_changes' fetch+persist

This lib. backfills & monitors newly closed ledgers for order book changes.

This relies on [the `book_changes` command addition](https://github.com/ripple/rippled/pull/4144) by @richardah and needs a MySQL database.

Config from `.env`.

DB schema in `/install/myqsl.sql`.
