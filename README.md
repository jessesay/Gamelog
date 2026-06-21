# GameLog v2.4 — Product Families / DLC Nesting

This update keeps DLCs, passes, soundtracks, upgrades, and smaller products inside their base game instead of letting them fill the main catalog and price boards.

## New

- Main Games catalog hides nested DLC/add-ons when a base game is detected.
- Game cards show compact add-on counts.
- Game details include a DLC & smaller products drawer.
- Price Watch groups add-ons under the base game family.
- Sales can surface either the base game or a nested DLC/pass.
- Steam import has an optional **Include DLC / smaller products** toggle.
- Optional Supabase SQL adds `product_type` and `parent_game_id` for cleaner future relationships.

## Install

Copy the patch into the repo root, replace files, commit:

`Build GameLog v2.4 product families`

Then run:

`update-gamelog.bat`

## Test

- Import Steam with **Include DLC / smaller products** checked.
- Open Games and confirm add-ons are not taking over the grid.
- Open a base game detail page and look for **DLC & smaller products**.
- Open Prices and confirm add-ons live inside the game family.

Optional Supabase SQL:

`supabase/v2_4_product_families.sql`
