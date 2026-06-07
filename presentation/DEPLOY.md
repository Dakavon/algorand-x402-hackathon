# Judge Link

The presentation is designed to be hosted as static files with the media in `images/`.

## GitHub Pages Link

After committing and pushing `presentation/`, `images/`, and `.github/workflows/presentation-pages.yml`, the link should be:

```txt
https://dakavon.github.io/algorand-x402-hackathon/presentation/
```

The root Pages URL also redirects to the deck:

```txt
https://dakavon.github.io/algorand-x402-hackathon/
```

## Required Files

The deck references these assets:

```txt
images/VID_20260607_102832239.mp4
images/IMG_20260607_102742337.jpg
images/IMG_20260607_084901918.jpg
images/law.png
```

The workflow publishes only these required assets, not the full `images/` folder. The largest file is the first-slide video at about 44 MB, so the deck may take a moment to load on a weak connection.

## If The Link 404s

In GitHub repository settings, set Pages source to `GitHub Actions`, then re-run the `Publish presentation` workflow.

## Local Check

From the repository root:

```bash
python3 -m http.server 4321
```

Open:

```txt
http://localhost:4321/presentation/
```
