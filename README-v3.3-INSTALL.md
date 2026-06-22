# GameLog v3.3 Install Notes

This update adds the Top 10,000 Catalog Import system.

## Install patch

1. Unzip `gamelog-next-v3.3-patch.zip`.
2. Copy the files into the root of your GameLog project.
3. Replace files when Windows asks.
4. Commit in GitHub Desktop:

```text
Build GameLog v3.3 top 10000 catalog system
```

5. Push origin.
6. Run:

```text
update-gamelog.bat
```

## Run Supabase SQL

In Supabase SQL Editor, run:

```text
supabase/v3_3_top_10000_catalog.sql
```

## Add local secret

In `.env.local`, add your Supabase service role key:

```text
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Keep this local. Do not commit it.

## Fill the database

Run:

```text
import-top-10000.bat
```

or:

```text
pnpm catalog:igdb-top
```

## Check progress

Run:

```text
check-catalog-count.bat
```

or:

```text
pnpm catalog:count
```

## Test website route

Open:

```text
/catalog-builder
```
