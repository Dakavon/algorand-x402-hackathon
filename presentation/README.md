# Presentation Deck

The deck is a standalone, full-screen HTML file at `presentation/index.html`.

Run it from this folder:

```bash
cd presentation
npm run dev
```

Or run it from the repository root so media references resolve:

```bash
python3 -m http.server 4321
```

Open:

```txt
http://localhost:4321/presentation/
```

Use arrow keys, space, page up, page down, or number keys `1` to `6` to move between slides.

Slides are fixed to the viewport and do not require scrolling.

If a final video is available, place it at:

```txt
images/VID_20260607_102832239.mp4
```

The first slide uses the video when present and falls back to the still image in `images/IMG_20260607_102742337.jpg`.

Slide 2 uses the law screenshot at:

```txt
images/law.png
```

Presenter notes are in `presentation/script.md`.

Judge-link deployment notes are in `presentation/DEPLOY.md`.
