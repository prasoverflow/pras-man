const canvas = document.getElementById("gameCanvas");
const scoreElement = document.getElementById("score");

if (!canvas) {
  throw new Error("Missing #gameCanvas element.");
}

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Unable to get 2D context from canvas.");
}
if (!scoreElement) {
  throw new Error("Missing #score element.");
}

const ROWS = 13;
const COLS = 19;
const TILE_SIZE = 40;
const HALF_TILE = TILE_SIZE / 2;

const GAME_WIDTH = COLS * TILE_SIZE;
const GAME_HEIGHT = ROWS * TILE_SIZE;

const PROTESTER_SPEED = 120;
const villain = {
    x: 9 * TILE_SIZE + HALF_TILE,
    y: 7 * TILE_SIZE + HALF_TILE,
    vx: 0,
    vy: 0,
    speed: 108,
    radius: 12,
    requestDir: "",
};


const COLORS = ["#3498db", "#e74c3c", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22"];
const POSTER_TEXTS = ["ДОЛУ!", "КОГАТО ПА", "ОСТАВКА", "ПЪТЕКИТЕ"];
const PROTEST_PHRASES = ["ОСТАВКА!", "КОГАТО ПА...", "МАФИЯ!", "САРАФОВ, ПЪТЕКИТЕ!", "ДОЛУ КОРУПЦИЯТА!", "ОСТАВКА И ЗАТВОР"];
const BASE_PROTESTER_SPEED = 120; 
const BASE_VILLAIN_SPEED = 140;  
const DIFFICULTY_RAMP = 0.05;   
const getDifficultyMultiplier = () => {
    return 1 + (score / 1000) * DIFFICULTY_RAMP;
};

const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
    [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
    [1,2,2,2,2,1,0,0,0,0,0,0,0,1,2,2,2,2,1],
    [1,1,1,1,2,1,0,1,1,0,1,1,0,1,2,1,1,1,1],
    [1,2,2,2,2,2,0,1,0,0,0,1,0,2,2,2,2,2,1],
    [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const protesters = [
    { x: TILE_SIZE, y: TILE_SIZE, vx: PROTESTER_SPEED, vy: 0, color: COLORS[0], type: "poster", seed: Math.random(), posterText: "" },
    { x: (COLS - 2) * TILE_SIZE, y: TILE_SIZE, vx: -PROTESTER_SPEED, vy: 0, color: COLORS[1], type: "hands", seed: Math.random(), posterText: "" },
    { x: TILE_SIZE, y: (ROWS - 2) * TILE_SIZE, vx: PROTESTER_SPEED, vy: 0, color: COLORS[2], type: "poster", seed: Math.random(), posterText: "" },
];

protesters.forEach((p) => {
    p.posterText = POSTER_TEXTS[Math.floor(Math.random() * POSTER_TEXTS.length)];
});

let score = 0;

let scale = 1;
let offsetX = 0;
let offsetY = 0;

let gameStarted = false;
let isGameOver = false;
let animationId = 0;
let lastSpawnScore = 0;
let lastTimestamp = 0;

let remainingMoney = 0;
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    if (map[r][c] === 2) {
      remainingMoney++;
    }
  }
}

function startGame() {
  if (!gameStarted) {
    gameStarted = true;
  }
}

const endGame = () => {
    if (!isGameOver) {
        isGameOver = true;
        cancelAnimationFrame(animationId);

        window.setTimeout(() => {
            window.location.reload();
        }, 3000);
    }
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  scale = Math.min(canvas.width / GAME_WIDTH, canvas.height / GAME_HEIGHT);
  offsetX = (canvas.width - GAME_WIDTH * scale) / 2;
  offsetY = (canvas.height - GAME_HEIGHT * scale) / 2;
}

window.addEventListener("resize", resize);
resize();

function spawnExtraProtester() {
    let r, c;
    do {
        r = Math.floor(Math.random() * ROWS);
        c = Math.floor(Math.random() * COLS);
    } while (map[r][c] === 1);

    const newProtester = {
        x: c * TILE_SIZE,
        y: r * TILE_SIZE,
        vx: Math.random() < 0.5 ? PROTESTER_SPEED : -PROTESTER_SPEED,
        vy: 0,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        type: Math.random() < 0.5 ? "poster" : "hands",
        seed: Math.random(),
        posterText: POSTER_TEXTS[Math.floor(Math.random() * POSTER_TEXTS.length)]
    };

    protesters.push(newProtester);
}

function isWall(x, y) {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);

  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
    return true;
  }
  return map[row][col] === 1;
}

function canVillainMoveTo(x, y) {
  const r = villain.radius;
  const inset = 2;

  const left = x - r + inset;
  const right = x + r - inset;
  const top = y - r + inset;
  const bottom = y + r - inset;

  if (isWall(left, top)) { return false; }
  if (isWall(right, top)) { return false; }
  if (isWall(left, bottom)) { return false; }
  if (isWall(right, bottom)) { return false; }

  return true;
}

function snapVillainToTileCenter() {
  villain.x = Math.round((villain.x - HALF_TILE) / TILE_SIZE) * TILE_SIZE + HALF_TILE;
  villain.y = Math.round((villain.y - HALF_TILE) / TILE_SIZE) * TILE_SIZE + HALF_TILE;
}


function handleVillainMovement(dt) {
    const currentSpeed = BASE_VILLAIN_SPEED * getDifficultyMultiplier();

    if (villain.requestDir !== "") {
        let nvx = 0;
        let nvy = 0;

        if (villain.requestDir === "up") { nvy = -currentSpeed; }
        else if (villain.requestDir === "down") { nvy = currentSpeed; }
        else if (villain.requestDir === "left") { nvx = -currentSpeed; }
        else if (villain.requestDir === "right") { nvx = currentSpeed; }

        const centerX = Math.floor(villain.x / TILE_SIZE) * TILE_SIZE + HALF_TILE;
        const centerY = Math.floor(villain.y / TILE_SIZE) * TILE_SIZE + HALF_TILE;

        const lookAhead = dt * 2; 
        const checkX = villain.x + nvx * lookAhead;
        const checkY = villain.y + nvy * lookAhead;

        if (canVillainMoveTo(checkX, checkY)) {
            if (nvy !== 0) { villain.x = centerX; }
            if (nvx !== 0) { villain.y = centerY; }
            villain.vx = nvx;
            villain.vy = nvy;
        }
    }

    const nx = villain.x + villain.vx * dt;
    const ny = villain.y + villain.vy * dt;

    if (canVillainMoveTo(nx, ny)) {
        villain.x = nx;
        villain.y = ny;
    } else {
        villain.vx = 0;
        villain.vy = 0;
        snapVillainToTileCenter();
    }
}

function isProtesterBlocked(nx, ny) {
  const max = TILE_SIZE - 1;
  if (isWall(nx, ny)) { return true; }
  if (isWall(nx + max, ny)) { return true; }
  if (isWall(nx, ny + max)) { return true; }
  if (isWall(nx + max, ny + max)) { return true; }
  return false;
}

function moveProtesters(dt) {
    if (isGameOver || !gameStarted) {
        return;
    }

    const currentProtesterSpeed = BASE_PROTESTER_SPEED * getDifficultyMultiplier();
    protesters.forEach((p) => {
        if (p.vx !== 0) { p.vx = p.vx > 0 ? currentProtesterSpeed : -currentProtesterSpeed; }
        if (p.vy !== 0) { p.vy = p.vy > 0 ? currentProtesterSpeed : -currentProtesterSpeed; }

        const nearCenterX = Math.abs((p.x % TILE_SIZE)) < 4 || Math.abs((p.x % TILE_SIZE) - TILE_SIZE) < 4;
        const nearCenterY = Math.abs((p.y % TILE_SIZE)) < 4 || Math.abs((p.y % TILE_SIZE) - TILE_SIZE) < 4;
        const isAtCenter = nearCenterX && nearCenterY;

        if (isAtCenter) {
            const possibleDirs = [];
            const dirs = [
                { dx: currentProtesterSpeed, dy: 0 },
                { dx: -currentProtesterSpeed, dy: 0 },
                { dx: 0, dy: currentProtesterSpeed },
                { dx: 0, dy: -currentProtesterSpeed },
            ];

            dirs.forEach((d) => {
                const stepX = d.dx > 0 ? TILE_SIZE : (d.dx < 0 ? -TILE_SIZE : 0);
                const stepY = d.dy > 0 ? TILE_SIZE : (d.dy < 0 ? -TILE_SIZE : 0);
                if (!isWall(p.x + stepX, p.y + stepY)) {
                    if (!(d.dx === -p.vx && d.dy === -p.vy)) {
                        possibleDirs.push(d);
                    }
                }
            });

            if (possibleDirs.length > 0 && Math.random() < 0.3) {
                const choice = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                p.x = Math.round(p.x / TILE_SIZE) * TILE_SIZE;
                p.y = Math.round(p.y / TILE_SIZE) * TILE_SIZE;
                p.vx = choice.dx;
                p.vy = choice.dy;
            }
        }

        const nx = p.x + p.vx * dt;
        const ny = p.y + p.vy * dt;

        if (!isProtesterBlocked(nx, ny)) {
            p.x = nx;
            p.y = ny;
        } else {
            const forced = [
                [currentProtesterSpeed, 0],
                [-currentProtesterSpeed, 0],
                [0, currentProtesterSpeed],
                [0, -currentProtesterSpeed],
            ];
            const d = forced[Math.floor(Math.random() * forced.length)];
            p.x = Math.round(p.x / TILE_SIZE) * TILE_SIZE;
            p.y = Math.round(p.y / TILE_SIZE) * TILE_SIZE;
            p.vx = d[0];
            p.vy = d[1];
        }

        if (Math.hypot(p.x + HALF_TILE - villain.x, p.y + HALF_TILE - villain.y) < (villain.radius + 13)) {
            endGame();
        }
    });
}

function collectMoneyIfAny() {
  const gx = Math.floor(villain.x / TILE_SIZE);
  const gy = Math.floor(villain.y / TILE_SIZE);

  if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
    if (map[gy][gx] === 2) {
      map[gy][gx] = 0;
      remainingMoney--;
      score += 100;
      scoreElement.innerText = `${score} €`;

      if (score - lastSpawnScore >= 2000) {
        spawnExtraProtester();
        lastSpawnScore = score;
      }

      if (remainingMoney <= 0) {
        endGame();
      }
    }
  }
}

function update(timestamp) {
    if (isGameOver) {
        return;
    }

    if (!lastTimestamp) {
        lastTimestamp = timestamp;
    }
    const dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const cappedDt = Math.min(dt, 0.1);

    handleVillainMovement(cappedDt);
    collectMoneyIfAny();
    moveProtesters(cappedDt);

    draw(timestamp);

    animationId = requestAnimationFrame(update);
}

function drawVillain(now) {
  const mouthOpen = Math.abs(Math.sin(now * 0.012)) * (Math.PI / 3);

  ctx.save();
  ctx.translate(villain.x, villain.y);

  if (villain.vx < 0) {
    ctx.scale(-1, 1);
  } else if (villain.vy < 0) {
    ctx.rotate(-Math.PI / 2);
  } else if (villain.vy > 0) {
    ctx.rotate(Math.PI / 2);
  }

  ctx.fillStyle = "#ffc0cb";

  ctx.beginPath();
  ctx.arc(0, 0, 20, Math.PI, 0, false);
  ctx.lineTo(0, 0);
  ctx.fill();

  ctx.save();
  ctx.rotate(mouthOpen);
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI, false);
  ctx.lineTo(0, 0);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#ffb6c1";
  ctx.beginPath();
  ctx.ellipse(-6, -16, 4, 8, -Math.PI / 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(16, -5);
  ctx.rotate(-Math.PI / 12);
  ctx.fillStyle = "#ff91a4";
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(5, -10, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawProtester(p, now) {
  const size = 20;
  const walk = Math.sin(now * 0.01 + p.seed * 10) * 3;
  const legs = Math.sin(now * 0.015 + p.seed * 10) * 8;

  ctx.save();
  ctx.translate(p.x + size, p.y + size + walk);
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.color;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(0, -10, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(0, 8);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(-4 + legs / 2, 18);
  ctx.moveTo(0, 8);
  ctx.lineTo(4 - legs / 2, 18);
  ctx.stroke();

  if (p.type === "poster") {
    ctx.strokeStyle = "#ddd";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -14);
    ctx.stroke();

    ctx.font = "bold 9px Arial";
    const words = p.posterText.split(" ");
    const lines = words.length > 2
      ? [words.slice(0, 2).join(" "), words.slice(2).join(" ")]
      : [p.posterText];

    const pw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 6;
    const ph = lines.length * 10 + 4;

    ctx.fillStyle = "white";
    ctx.fillRect(-pw / 2, -30 - (lines.length - 1) * 10, pw, ph);

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(-pw / 2, -30 - (lines.length - 1) * 10, pw, ph);

    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, -30 + 8 + (i * 10) - (lines.length - 1) * 5);
    });
  } else if (p.type === "hands") {
    const wave = Math.sin(now * 0.02 + p.seed * 5) * 5; 
    
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(-8 + wave, -15);
    ctx.moveTo(0, -2);
    ctx.lineTo(8 + wave, -15);
    ctx.stroke();
  }

  if (Math.sin(now * 0.001 + p.seed * 100) > 0.6) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sx = offsetX + (p.x + HALF_TILE) * scale;
    const sy = offsetY + (p.y - 10) * scale;
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    const phrase = PROTEST_PHRASES[Math.floor(p.seed * PROTEST_PHRASES.length)];
    ctx.strokeText(phrase, sx, sy);
    ctx.fillText(phrase, sx, sy);
    ctx.restore();
  }

  ctx.restore();
}

function drawMoneyBag(x, y) {
  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.fillStyle = "#bdc3c7";
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "#f1c40f";
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7f8c8d";
  ctx.font = "bold 9px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("€", 0, 0);

  ctx.restore();
}

function draw(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "black"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 1) {
                ctx.fillStyle = "#636363";
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else {
                ctx.fillStyle = "#1a1a1a";
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                if (map[r][c] === 2) {
                    drawMoneyBag(c * TILE_SIZE + HALF_TILE, r * TILE_SIZE + HALF_TILE);
                }
            }
        }
    }

    protesters.forEach((p) => { drawProtester(p, now); });
    drawVillain(now);

    if (isGameOver) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const pulse = Math.abs(Math.sin(now * 0.01));
        ctx.fillStyle = `rgb(${150 + Math.floor(pulse * 105)}, 0, 0)`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const fs = Math.floor(canvas.width / 12);
        ctx.font = `bold ${fs}px Arial`;
        ctx.fillText("ОСТАВКА И ЗАТВОР", canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = "bold 24px Arial";
        ctx.fillStyle = "white";
        ctx.fillText(`Накраде за последно: ${score} €`, canvas.width / 2, canvas.height / 2 + fs);
    }

    if (!gameStarted && !isGameOver) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = "bold 60px Arial";
        ctx.fillText("ПРАС-МАН", canvas.width / 2, canvas.height / 2 - 60);

        const pPulse = Math.abs(Math.sin(now * 0.005));
        ctx.font = "bold 30px Arial";
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + pPulse * 0.7})`;
        ctx.fillText("ДОКОСНИ ЗА КРАЖБА", canvas.width / 2, canvas.height / 2 + 10);

        ctx.font = "18px Arial";
        ctx.fillStyle = "#ccc";
        ctx.fillText("Плъзни, за да движиш Прасето", canvas.width / 2, canvas.height / 2 + 70);
    }
}

window.addEventListener("keydown", (e) => {
  startGame();
  if (e.key.startsWith("Arrow")) {
    villain.requestDir = e.key.replace("Arrow", "").toLowerCase();
  }
});

let tsX = 0;
let tsY = 0;

window.addEventListener("touchstart", (e) => {
  startGame();
  tsX = e.touches[0].clientX;
  tsY = e.touches[0].clientY;
}, { passive: false });

window.addEventListener("touchend", (e) => {
  if (!tsX || !tsY) {
    return;
  }

  const dx = e.changedTouches[0].clientX - tsX;
  const dy = e.changedTouches[0].clientY - tsY;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (Math.abs(dx) > 20) {
      villain.requestDir = dx > 0 ? "right" : "left";
    }
  } else {
    if (Math.abs(dy) > 20) {
      villain.requestDir = dy > 0 ? "down" : "up";
    }
  }

  tsX = 0;
  tsY = 0;
}, { passive: false });

window.addEventListener("touchmove", (e) => {
  e.preventDefault();
}, { passive: false });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(animationId);
  } else if (!isGameOver && gameStarted) {
    animationId = requestAnimationFrame(update);
  }
});

animationId = requestAnimationFrame(update);
