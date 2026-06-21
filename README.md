# GameLog v2.3 — Price Watch Layer

This patch adds game/product price tracking to GameLog.

## New

- Price Watch section in top navigation and mobile navigation.
- Track games/products from the catalog.
- Steam current price lookup through `/api/prices/steam`.
- Local historical price snapshots.
- Price history chart per watched game.
- Games on sale board.
- Export price data JSON.
- Optional Supabase SQL: `supabase/v2_3_price_watch.sql`.

## Install

Copy this patch into the root of the GameLog repo and replace files.

Commit:

`Build GameLog v2.3 Price Watch layer`

Then run:

`update-gamelog.bat`

## Test

Open `http://localhost:3000` and check:

- Home → Price Watch
- Top nav → Prices
- Games → Price button
- Prices → Watch / Check / Seed sample history
- Prices → Games on sale

Steam prices work best for games imported from Steam or games that Steam can match by title. Historical charts grow as you check prices over time. Seed sample history is included so you can see the chart immediately while testing.
