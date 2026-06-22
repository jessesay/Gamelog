# GameLog v3.2 — Completion Time Layer

This update makes GameLog consider how long games take to finish when showing catalog games, shelves, lists, Matchmaker picks, backlog plans, public game pages, and public list pages.

## New

- Time-to-complete badges on game cards
- Catalog filter by completion length
- Catalog sort by shortest / longest / best fit
- Library backlog time totals
- Short wins and huge saves count
- Backlog attack plan now favors playable time commitments
- Matchmaker now uses completion time for Quick / One night / Long haul
- Public list pages show total list completion time
- Public game pages show main, extras, and completionist estimates
- Optional Supabase columns for future real completion data

## Install

1. Copy the patch files into the root of your GameLog project.
2. Replace files when Windows asks.
3. Commit in GitHub Desktop:

`Build GameLog v3.2 completion time layer`

4. Push origin.
5. Run:

`update-gamelog.bat`

## Optional Supabase

Run this later if you want cloud-backed completion-time fields:

`supabase/v3_2_completion_time.sql`

GameLog still works without this SQL because it has smart local estimates.
