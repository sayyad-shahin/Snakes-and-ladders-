(() => {
  "use strict";

  // ---- Game data -----------------------------------------------------
  const SNAKES  = {16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 98:78};
  const LADDERS = {1:38, 4:14, 9:31, 21:42, 28:84, 36:44, 51:67, 71:91, 80:100};
  const COLORS = ["#e63946", "#2a9d8f", "#f4a000", "#6a4c93"];
  const NAMES  = ["Red", "Teal", "Gold", "Purple"];
  const FACES  = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const OFFSETS = [[-2.2,-2.2],[2.2,-2.2],[-2.2,2.2],[2.2,2.2]];
  const SNAKE_COLORS = ["#2e7d32", "#c2185b", "#6a1b9a", "#ef6c00", "#00838f"];

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = {
    board: $("board"), players: $("players"), dice: $("dice"), roll: $("rollBtn"),
    status: $("status"), log: $("log"), setup: $("setup"), win: $("winModal"),
    winText: $("winText"), winSub: $("winSub"), vsCpu: $("vsCpu"),
  };

  // Square number (1-100) -> column/row on the board (snake-style numbering).
  function coords(n) {
    const i = n - 1, row = Math.floor(i / 10);
    let col = i % 10;
    if (row % 2) col = 9 - col;
    return { x: col, y: 9 - row };
  }
  // Centre of a square in board percent units. Square 0 = waiting below square 1.
  function center(n) {
    if (n === 0) return { x: 5, y: 106 };
    const c = coords(n);
    return { x: c.x * 10 + 5, y: c.y * 10 + 5 };
  }

  // ---- Board drawing -------------------------------------------------
  function buildBoard() {
    el.board.innerHTML = "";
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const row = 9 - y;
        const col = row % 2 ? 9 - x : x;
        const n = row * 10 + col + 1;
        const cell = document.createElement("div");
        cell.className = "cell" + ((x + y) % 2 ? " alt" : "") + (n === 100 ? " end" : "");
        cell.textContent = n;
        el.board.appendChild(cell);
      }
    }
    let svg = "";
    Object.entries(LADDERS).forEach(([from, to]) => {
      const a = center(+from), b = center(+to);
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const px = (-dy / len) * 1.1, py = (dx / len) * 1.1;
      svg += `<line x1="${a.x + px}" y1="${a.y + py}" x2="${b.x + px}" y2="${b.y + py}" stroke="#8a5a2b" stroke-width="0.8" stroke-linecap="round"/>`;
      svg += `<line x1="${a.x - px}" y1="${a.y - py}" x2="${b.x - px}" y2="${b.y - py}" stroke="#8a5a2b" stroke-width="0.8" stroke-linecap="round"/>`;
      const rungs = Math.max(2, Math.floor(len / 4));
      for (let i = 1; i < rungs; i++) {
        const t = i / rungs, cx = a.x + dx * t, cy = a.y + dy * t;
        svg += `<line x1="${cx + px}" y1="${cy + py}" x2="${cx - px}" y2="${cy - py}" stroke="#b07a3f" stroke-width="0.6" stroke-linecap="round"/>`;
      }
    });
    Object.entries(SNAKES).forEach(([from, to], k) => {
      const h = center(+from), t = center(+to);
      const dx = t.x - h.x, dy = t.y - h.y, len = Math.hypot(dx, dy);
      const ux = -dy / len, uy = dx / len, color = SNAKE_COLORS[k % SNAKE_COLORS.length];
      let d = "";
      for (let i = 0; i <= 24; i++) {
        const s = i / 24, w = Math.sin(s * Math.PI * 3) * 2.2 * (1 - s * 0.5);
        d += `${i ? "L" : "M"}${(h.x + dx * s + ux * w).toFixed(2)} ${(h.y + dy * s + uy * w).toFixed(2)} `;
      }
      svg += `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
      svg += `<circle cx="${h.x}" cy="${h.y}" r="1.9" fill="${color}"/>`;
      svg += `<circle cx="${h.x - 0.6}" cy="${h.y - 0.5}" r="0.45" fill="#fff"/><circle cx="${h.x + 0.6}" cy="${h.y - 0.5}" r="0.45" fill="#fff"/>`;
    });
    el.board.insertAdjacentHTML("beforeend", `<svg class="overlay" viewBox="0 0 100 100" aria-hidden="true">${svg}</svg>`);
  }

  // ---- Game state ----------------------------------------------------
  let players = [], cur = 0, busy = false, over = true, count = 2;

  function placeToken(p, ms = 250) {
    const c = center(p.pos), o = OFFSETS[p.id];
    p.tok.style.transitionDuration = (reduceMotion ? 0 : ms) + "ms";
    p.tok.style.left = c.x + o[0] + "%";
    p.tok.style.top = c.y + o[1] + "%";
  }

  function log(msg) {
    const li = document.createElement("li");
    li.textContent = msg;
    el.log.prepend(li);
    while (el.log.children.length > 40) el.log.lastChild.remove();
  }

  function renderPlayers() {
    el.players.innerHTML = "";
    players.forEach((p, i) => {
      const li = document.createElement("li");
      if (i === cur && !over) li.className = "current";
      li.innerHTML = `<span class="dot" style="background:${p.color}"></span><b>${p.name}${p.cpu ? " (CPU)" : ""}</b><span class="pos">${p.pos === 0 ? "Start" : "Square " + p.pos}</span>`;
      el.players.appendChild(li);
      p.tok.classList.toggle("active", i === cur && !over);
    });
  }

  function updateUI() {
    renderPlayers();
    const p = players[cur];
    el.roll.disabled = busy || over || p.cpu;
    if (!over) el.status.textContent = p.cpu ? `${p.name} (computer) is playing…` : `${p.name}'s turn. Roll the dice!`;
  }

  function startGame() {
    document.querySelectorAll(".token").forEach((t) => t.remove());
    el.log.innerHTML = "";
    players = Array.from({ length: count }, (_, i) => {
      const tok = document.createElement("div");
      tok.className = "token";
      tok.style.background = COLORS[i];
      el.board.appendChild(tok);
      return { id: i, name: NAMES[i], color: COLORS[i], pos: 0, tok, cpu: el.vsCpu.checked && i > 0 };
    });
    players.forEach((p) => placeToken(p, 0));
    cur = 0; busy = false; over = false;
    el.setup.classList.add("hidden");
    el.win.classList.add("hidden");
    log("Game started. Good luck!");
    updateUI();
    autoPlay();
  }

  function rollValue() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return (a[0] % 6) + 1;
  }

  async function rollDice() {
    el.dice.classList.add("rolling");
    const spins = reduceMotion ? 1 : 8;
    for (let i = 0; i < spins; i++) {
      el.dice.textContent = FACES[Math.floor(Math.random() * 6)];
      await sleep(70);
    }
    const v = rollValue();
    el.dice.textContent = FACES[v - 1];
    el.dice.setAttribute("aria-label", "Dice shows " + v);
    el.dice.classList.remove("rolling");
    return v;
  }

  async function move(p, v) {
    if (p.pos + v > 100) {
      log(`${p.name} needs an exact roll to reach 100 and stays on ${p.pos}.`);
      return;
    }
    for (let i = 0; i < v; i++) {
      p.pos++;
      placeToken(p);
      renderPlayers();
      await sleep(reduceMotion ? 0 : 230);
    }
    const dest = SNAKES[p.pos] || LADDERS[p.pos];
    if (dest) {
      const isSnake = p.pos in SNAKES;
      log(isSnake ? `🐍 ${p.name} was bitten on ${p.pos} and slid down to ${dest}.`
                  : `🪜 ${p.name} climbed a ladder from ${p.pos} up to ${dest}!`);
      await sleep(reduceMotion ? 0 : 350);
      p.pos = dest;
      placeToken(p, 700);
      renderPlayers();
      await sleep(reduceMotion ? 0 : 750);
    }
  }

  async function turn() {
    if (busy || over) return;
    busy = true;
    el.roll.disabled = true;
    const p = players[cur];
    const v = await rollDice();
    log(`${p.name} rolled a ${v}.`);
    await move(p, v);
    if (p.pos === 100) return win(p);
    if (v === 6) log(`${p.name} rolled a 6 and plays again.`);
    else cur = (cur + 1) % players.length;
    busy = false;
    updateUI();
    autoPlay();
  }

  function autoPlay() {
    if (!over && players[cur].cpu) setTimeout(turn, 800);
  }

  function win(p) {
    over = true; busy = false;
    log(`🏆 ${p.name} wins the game!`);
    el.status.textContent = `${p.name} wins!`;
    el.winText.textContent = `🏆 ${p.name} wins!`;
    el.winSub.textContent = "Congratulations! Ready for another round?";
    renderPlayers();
    el.roll.disabled = true;
    el.win.classList.remove("hidden");
  }

  // ---- Events --------------------------------------------------------
  $("countChoices").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-n]");
    if (!b) return;
    count = +b.dataset.n;
    document.querySelectorAll(".choice").forEach((c) => c.classList.toggle("active", c === b));
  });
  $("startBtn").addEventListener("click", startGame);
  $("againBtn").addEventListener("click", () => { el.win.classList.add("hidden"); el.setup.classList.remove("hidden"); });
  $("newGame").addEventListener("click", () => el.setup.classList.remove("hidden"));
  el.roll.addEventListener("click", turn);
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body && !el.roll.disabled) { e.preventDefault(); turn(); }
  });

  buildBoard();
})();
