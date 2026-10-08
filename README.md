# CigApp

Mobilna webova appka na zapisovanie aktualneho stavu cigariet v otvorenej krabicke.

## Ako to funguje

- Otvoris novu krabicku a zadas jej velkost.
- Kedykolvek pocas dna zadas aktualny pocet cigariet v krabicke.
- Cas sa ulozi automaticky.
- Appka dopocita spotrebu medzi po sebe iducimi stavmi.
- Casove bloky sa zobrazia az v prehlade.
- Data sa ukladaju lokalne v prehliadaci a daju sa exportovat do CSV.
- Po prihlaseni sa synchronizuju cez Neon Auth a Neon Data API; offline/localStorage rezim ostava dostupny.
- Prihlasenie aj vytvorenie uctu pouziva sestmiestny jednorazovy kod poslany na e-mail; heslo nie je potrebne.

## Spustenie

Najjednoduchsie je otvorit `index.html` v prehliadaci. Pre PWA instalaciu a service worker je lepsie spustit lokalny server:

```powershell
python -m http.server 8000
```

Potom otvor:

```text
http://localhost:8000
```

## Neon

Do `config.js` dopln verejne Auth URL a Data API URL production vetvy. Nikdy
sem nevkladaj Postgres connection string, API kluc ani heslo. Reprodukovatelna
schema, testovanie a bezpecny plan migracie existujucich uctov/dat su v
`neon/README.md` a `neon/MIGRATION.md`.

Lokalne kontroly:

```powershell
pnpm install
pnpm check
pnpm test
```
