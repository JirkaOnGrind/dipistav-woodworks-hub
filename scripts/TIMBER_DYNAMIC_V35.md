# Konfigurátor dynamického řeziva v35

Geometrie všech trámů, fošen, prken a latí je v
`scripts/timber_dynamic_config_v35.json`. Každý vektor ovládá celou rodinu:

- `column: [x, y]` — rozestup dalších kusů vedle sebe,
- `rowDown: [x, y]` — posun dalšího patra dolů v projekci,
- `back: [x, y]` — délka a perspektiva kusu,
- `seamWidth` a `seamColor` — dělicí linky mezi kusy.

Po úpravě spusťte z kořene projektu:

```powershell
python scripts/compose_timber_dynamic_v35.py
```

Pro rychlé ladění jedné rodiny lze přidat například `--family beam`. Výchozí
generování zachová schválené stavy 1 a 2 přesně po bytech. Přepínač
`--allow-golden-drift` je určený jen pro vědomé přegenerování těchto dvou stavů.

Pevný produkční kontrakt je 5 kusů na patro a maximálně 20 zobrazených kusů.
