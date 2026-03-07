# Mosasaurus Avontuur (Phaser)

Browsergame in Phaser 3.

## Nieuwe v2 features

- Eerlijke hit-zones: aparte body-hit en mouth-hit cirkels
- Moeilijkheid stijgt zichtbaar (speed-level HUD)
- Prooien: vis + inktvis
- Obstakels: rots + koraal
- Quiz-item met pauze-popup en bonus (+50)
- Wateroppervlak zichtbaar + automatisch springen
- Ademsysteem met luchtbalk en game-over bij 0
- Parallax bubbles die naar links bewegen
- Staartanimatie
- SFX + simpele muziek (WebAudio)

## Eigen mosasaurus-spritesheet gebruiken

Plaats dit bestand in `assets`:

- `assets/mosasaurus_sheet.png`

Verwachte indeling van de sheet:
- 2 rijen, 3 kolommen
- framegrootte: `560x150`
- bovenste rij: bek dicht (staart links/midden/rechts)
- onderste rij: bek open (staart links/midden/rechts)

Als de sheet ontbreekt, gebruikt de game fallback-art.

## Starten

```bash
uv run python -m http.server 8000
```

Open daarna:

- <http://localhost:8000>

## Deploy naar GitHub Pages

Workflow staat klaar in:

- `.github/workflows/deploy-pages.yml`

Eenmalig in GitHub repo-instellingen:

1. Ga naar `Settings -> Pages`.
2. Kies bij `Build and deployment` voor `Source: GitHub Actions`.
3. Push naar `main`.

Daarna wordt de game automatisch gedeployed op elke push naar `main`.

## Besturing

- `Enter` / `Spatie`: starten of retry
- `Pijl omhoog/omlaag` of `W/S`: zwemmen
- `1/2/3`: quizantwoord tijdens quiz-popup
- `Esc`: terug naar menu
- `M`: music toggle
- `N`: sfx toggle
