const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game Variables
let slicedCount = 0;
let computeValue = 0;
let lives = 3;
let gameOver = false;
let spawnTimer = 0;

// Laser Trail
let bladePath = []; // {x, y, time}

// Canvas Entities
let flyingItems = [];
let slicedHalves = [];
let particles = [];
let gridSplashes = [];

// AI Generative Node Database
const AI_NODES = [
  { id: 'neural_melon', name: 'Neural Matrix Core', compute: 12.5, isBomb: false, color: '#00F0FF', coreColor: '#FFFFFF', radius: 24, tip: '⚡ Neural Matrix Cores process 10,000 synthetic parameters per millisecond.' },
  { id: 'cyber_banana', name: 'Quantum Data Strand', compute: 4.8, isBomb: false, color: '#FFB800', coreColor: '#FFF', radius: 18, tip: '⚡ Quantum Strands accelerate matrix multiplication with zero thermal noise.' },
  { id: 'quantum_apple', name: 'Synthetix Node', compute: 8.5, isBomb: false, color: '#FF0055', coreColor: '#FFAAE5', radius: 20, tip: '⚡ Synthetix Nodes stream real-time generative visual vectors.' },
  { id: 'nano_carrot', name: 'Bio-Vector Core', compute: 6.2, isBomb: false, color: '#FF7700', coreColor: '#FFE0B2', radius: 18, tip: '⚡ Bio-Vectors optimize neural network gradient convergence rates.' },
  { id: 'bio_broccoli', name: 'Generative Cluster', compute: 15.0, isBomb: false, color: '#00FF66', coreColor: '#D4FFEA', radius: 22, tip: '⚡ Generative Clusters produce ultra-high resolution latent space renders.' },
  { id: 'malware_trap', name: 'Corrupted Malware Bomb', compute: -25.0, isBomb: true, color: '#FF0033', coreColor: '#000', radius: 22, tip: '💥 BREACH DETECTED! Malware injection drained compute capacity & damaged system integrity!' }
];

// Trigger Phone Screen White Flash
function triggerWhiteFlash() {
  const flash = document.getElementById("flashOverlay");
  if (!flash) return;
  flash.classList.add("active");
  setTimeout(() => {
    flash.classList.remove("active");
  }, 250);
}

// Web Audio Synthesizer
function playLaserSound(type) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const actx = new AudioCtx();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);

    if (type === 'slash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, actx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, actx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, actx.currentTime + 0.08);
      osc.start(); osc.stop(actx.currentTime + 0.08);
    } else if (type === 'explode') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, actx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, actx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.5, actx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, actx.currentTime + 0.35);
      osc.start(); osc.stop(actx.currentTime + 0.35);
    }
  } catch(e) {}
}

// Node Drawing Routines
function drawAINodeShape(ctx, node) {
  const radius = node.radius;

  ctx.save();
  ctx.shadowColor = node.color;
  ctx.shadowBlur = 12;

  if (node.isBomb) {
    ctx.fillStyle = '#060913';
    ctx.strokeStyle = '#FF0055';
    ctx.lineWidth = 3;

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const r = (i % 2 === 0) ? radius + 6 : radius - 4;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#FF0055';
    ctx.font = '900 15px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚠', 0, 0);
  } else {
    ctx.fillStyle = 'rgba(6, 9, 19, 0.85)';
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = node.coreColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.8, radius * 0.25, Math.PI / 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHalvedAINode(ctx, node, side) {
  ctx.save();
  ctx.clip(new Path2D(side === 1 ? 'M -60 -60 L 0 -60 L 0 60 L -60 60 Z' : 'M 0 -60 L 60 -60 L 60 60 L 0 60 Z'));
  drawAINodeShape(ctx, node);

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#00F0FF';
  ctx.shadowBlur = 10;
  ctx.fillRect(-2, -node.radius - 8, 4, (node.radius + 8) * 2);
  ctx.restore();
}

// Spawning Engine
function spawnCluster() {
  if (gameOver) return;

  const count = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < count; i++) {
    const nodeDef = AI_NODES[Math.floor(Math.random() * AI_NODES.length)];

    flyingItems.push({
      ...nodeDef,
      x: 60 + Math.random() * (canvas.width - 120),
      y: canvas.height + 30,
      vx: (Math.random() - 0.5) * 4.5,
      vy: -(12.5 + Math.random() * 3.5),
      gravity: 0.28,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.12,
      sliced: false
    });
  }
}

// Slice Distance Detector
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function checkSlices() {
  if (bladePath.length < 2) return;

  const p1 = bladePath[bladePath.length - 2];
  const p2 = bladePath[bladePath.length - 1];

  for (let i = flyingItems.length - 1; i >= 0; i--) {
    const item = flyingItems[i];
    if (item.sliced) continue;

    const dist = distToSegment(item.x, item.y, p1.x, p1.y, p2.x, p2.y);

    if (dist < item.radius + 8) {
      item.sliced = true;

      // HIT MALWARE BOMB
      if (item.isBomb) {
        triggerWhiteFlash(); // Flash entire screen white
        playLaserSound('explode');
        createCyberExplosion(item.x, item.y);
        triggerGameOver("💥 MALWARE BREACH! Sliced a Corrupted Virus Bomb!");
        return;
      }

      // SLICE DATA NODE
      playLaserSound('slash');
      slicedCount++;
      computeValue += item.compute;

      document.getElementById('sliced-count').innerText = slicedCount;
      document.getElementById('budget-display').innerText = `${computeValue.toFixed(1)} FLOPS`;
      document.getElementById('tip-display').innerHTML = item.tip;

      gridSplashes.push({
        x: item.x, y: item.y,
        color: item.color,
        radius: 10, alpha: 0.9
      });

      for (let p = 0; p < 16; p++) {
        particles.push({
          x: item.x, y: item.y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          color: Math.random() > 0.5 ? item.color : '#FFFFFF',
          size: 2 + Math.random() * 4,
          alpha: 1.0
        });
      }

      slicedHalves.push({
        node: item, side: 1,
        x: item.x - 6, y: item.y, vx: item.vx - 3, vy: item.vy - 1, gravity: 0.3,
        rotation: item.rotation, vRot: -0.1
      });
      slicedHalves.push({
        node: item, side: 2,
        x: item.x + 6, y: item.y, vx: item.vx + 3, vy: item.vy - 1, gravity: 0.3,
        rotation: item.rotation, vRot: 0.1
      });

      flyingItems.splice(i, 1);
    }
  }
}

function createCyberExplosion(x, y) {
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.5) * 16,
      color: Math.random() > 0.5 ? '#FF0055' : '#00F0FF',
      size: 4 + Math.random() * 6,
      alpha: 1.0
    });
  }
}

function updateLivesUI() {
  let shields = "";
  for (let i = 0; i < 3; i++) {
    shields += (i < lives) ? "🛡️ " : "❌ ";
  }
  document.getElementById("lives-display").innerText = shields.trim();
}

function triggerGameOver(reason) {
  gameOver = true;
  document.getElementById("death-reason").innerText = reason;
  document.getElementById("final-sliced").innerText = slicedCount;
  document.getElementById("final-budget").innerText = `${computeValue.toFixed(1)} FLOPS`;
  document.getElementById("gameOverScreen").style.display = "flex";
}

function resetGame() {
  slicedCount = 0;
  computeValue = 0;
  lives = 3;
  gameOver = false;
  flyingItems = [];
  slicedHalves = [];
  particles = [];
  gridSplashes = [];
  bladePath = [];

  document.getElementById("sliced-count").innerText = "0";
  document.getElementById("budget-display").innerText = "0.0 FLOPS";
  document.getElementById("tip-display").innerHTML = "⚡ <strong>NEURAL PROTOCOL:</strong> Slash airborne AI Data Cores! Avoid slicing Red Corrupted Malware Bombs!";
  document.getElementById("gameOverScreen").style.display = "none";

  updateLivesUI();
}

// Engine Loop
function update() {
  if (gameOver) return;

  spawnTimer++;
  if (spawnTimer > 65) {
    spawnCluster();
    spawnTimer = 0;
  }

  for (let i = flyingItems.length - 1; i >= 0; i--) {
    const item = flyingItems[i];
    item.x += item.vx;
    item.y += item.vy;
    item.vy += item.gravity;
    item.rotation += item.vRot;

    if (item.y > canvas.height + 40) {
      if (!item.isBomb && !item.sliced) {
        lives--;
        updateLivesUI();
        if (lives <= 0) {
          triggerGameOver("System Integrity Depleted! Unharvested Data Nodes Lost!");
        }
      }
      flyingItems.splice(i, 1);
    }
  }

  for (let i = slicedHalves.length - 1; i >= 0; i--) {
    const half = slicedHalves[i];
    half.x += half.vx;
    half.y += half.vy;
    half.vy += half.gravity;
    half.rotation += half.vRot;

    if (half.y > canvas.height + 50) {
      slicedHalves.splice(i, 1);
    }
  }

  for (let i = gridSplashes.length - 1; i >= 0; i--) {
    const s = gridSplashes[i];
    s.radius += 2.5;
    s.alpha -= 0.04;
    if (s.alpha <= 0) gridSplashes.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.03;
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  const now = Date.now();
  bladePath = bladePath.filter(p => now - p.time < 160);

  checkSlices();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Grid
  ctx.save();
  ctx.strokeStyle = "rgba(0, 240, 255, 0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 25) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 25) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  ctx.restore();

  // Grid Splashes
  gridSplashes.forEach(s => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, s.alpha);
    ctx.strokeStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  // Flying Nodes
  flyingItems.forEach(item => {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);
    drawAINodeShape(ctx, item);
    ctx.restore();
  });

  // Halves
  slicedHalves.forEach(half => {
    ctx.save();
    ctx.translate(half.x, half.y);
    ctx.rotate(half.rotation);
    drawHalvedAINode(ctx, half.node, half.side);
    ctx.restore();
  });

  // Particles
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Blade Path
  if (bladePath.length > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < bladePath.length; i++) {
      const p1 = bladePath[i - 1];
      const p2 = bladePath[i];
      const alpha = i / bladePath.length;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = alpha * 8;
      ctx.strokeStyle = '#FFFFFF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 15;
      ctx.globalAlpha = alpha;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Controls Logic
function addBladePoint(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);

  bladePath.push({ x, y, time: Date.now() });
}

let isSwiping = false;

canvas.addEventListener('mousedown', e => { isSwiping = true; addBladePoint(e); });
canvas.addEventListener('mousemove', e => { if (isSwiping) addBladePoint(e); });
window.addEventListener('mouseup', () => isSwiping = false);

canvas.addEventListener('touchstart', e => { isSwiping = true; addBladePoint(e); }, { passive: true });
canvas.addEventListener('touchmove', e => { if (isSwiping) addBladePoint(e); }, { passive: true });
window.addEventListener('touchend', () => isSwiping = false);

// Start
gameLoop();
