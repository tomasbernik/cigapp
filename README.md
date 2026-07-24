# CigApp

Mobilna webova appka na zapisovanie aktualneho stavu cigariet v otvorenej krabicke.

## Ako to funguje

- Otvoris novu krabicku a zadas jej velkost.
- Kedykolvek pocas dna zadas aktualny pocet cigariet v krabicke.
- Cas sa ulozi automaticky.
- Appka dopocita spotrebu medzi po sebe iducimi stavmi.
- Casove bloky sa zobrazia az v prehlade.
- Data sa ukladaju lokalne v prehliadaci a daju sa exportovat do CSV.

## Spustenie

Najjednoduchsie je otvorit `index.html` v prehliadaci. Pre PWA instalaciu a service worker je lepsie spustit lokalny server:

```powershell
python -m http.server 8000
```

Potom otvor:

```text
http://localhost:8000
```
