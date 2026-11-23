# 🐍🪜 Snakes & Ladders

A classic Snakes and Ladders board game that runs in the browser. Play with 2 to 4 players on one device, or play against the computer.

## Features
- 10x10 board with 10 snakes and 9 ladders, drawn with SVG
- 2 to 4 players, with an option to play against the computer
- Animated dice and step-by-step token movement
- Roll a 6 to play again; an exact roll is needed to land on 100
- Live player positions, turn indicator and game log
- Winner screen with Play again
- Fair dice using `crypto.getRandomValues`
- Keyboard support (Space to roll), responsive layout, respects "reduce motion"
- No frameworks, no build step, no dependencies

## How to play
1. Open the game and choose the number of players, then click **Start game**.
2. Click **Roll dice** (or press Space) on your turn.
3. Landing on the bottom of a ladder takes you up. Landing on a snake's head takes you down.
4. The first player to land exactly on square 100 wins.

## Run locally
Open `index.html` in any modern browser. Or serve the folder:

```bash
# Windows
py -m http.server 8000
# macOS / Linux
python3 -m http.server 8000
```
Then visit http://localhost:8000.

## Deploy on GitHub Pages
1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages**.
3. Choose **Deploy from a branch**, select `main` and `/ (root)`, then **Save**.
4. Your game will be live at `https://<your-username>.github.io/<repo-name>/`.

## Customize
Edit the `SNAKES` and `LADDERS` tables at the top of `script.js` (`start: end`). The board redraws automatically.

## Project structure
```
snakes-and-ladders/
├── index.html
├── style.css
├── script.js
├── README.md
└── LICENSE
```

## License
MIT – see [LICENSE](LICENSE).
