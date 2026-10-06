// Game Engine Canvas Initialization
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// State Variables
let isMouseDown = false;
let mouseTrail = [];
let targets = [];
let particles = [];
let score = 0;
let health = 100;
let combo = 0;
let comboTimer = null;
let isGameRunning = false;
let spawnInterval = null;

// UI Elements
const colorSelect = document.getElementById('color-select');
const shapeSelect = document.getElementById('shape-select');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Web Audio Synthesizer
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'slice') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
    } else if (type === 'bomb') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.25);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
    }
}

// Pointer / Click & Drag Handling
canvas.addEventListener('pointerdown', (e) => {
    isMouseDown = true;
    mouseTrail = [];
    addPoint(e);
});

canvas.addEventListener('pointermove', (e) => {
    if (isMouseDown) {
        addPoint(e);
        checkSlices();
    }
});

window.addEventListener('pointerup', () => {
    isMouseDown = false;
});

function addPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    mouseTrail.push({ x, y, age: 1.0, time: Date.now() });
}

// Dynamic Blade Trail Color Calculations
function getBladeColor(index, total) {
    const mode = colorSelect.value;
    const now = Date.now();

    if (mode === 'rainbow') {
        const hue = (now / 5 + index * 12) % 360;
        return `hsl(${hue}, 100%, 60%)`;
    } else if (mode === 'cyan') {
        return `hsl(185, 100%, ${50 + index * 2}%)`;
    } else if (mode === 'emerald') {
        return `hsl(150, 100%, ${45 + index * 2}%)`;
    } else if (mode === 'pink') {
        return `hsl(330, 100%, ${55 + index * 2}%)`;
    } else if (mode === 'amber') {
        return `hsl(40, 100%, ${50 + index * 2}%)`;
    } else if (mode === 'fire') {
        const hue = 10 + (index / total) * 35;
        return `hsl(${hue}, 100%, 50%)`;
    }
    return '#00ffaa';
}

// Target Object Types
const TARGET_TYPES = [
    { name: 'Data Node', color: '#00e5ff', points: 10, isBomb: false, icon: '💎' },
    { name: 'Fresh Avocado', color: '#00ffaa', points: 15, isBomb: false, icon: '🥑' },
    { name: 'Healthy Salmon', color: '#ff7755', points: 20, isBomb: false, icon: '🍣' },
    { name: 'Malware Core', color: '#ff3366', points: -20, isBomb: true, icon: '👾' }
];

function spawnTarget() {
    if (!isGameRunning) return;
    const type = TARGET_TYPES[Math.floor(Math.random() * (Math.random() > 0.25 ? 3 : 4))];
    targets.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: canvas.height + 30,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 4 + 11),
        radius: 26,
        type: type,
        rotation: 0,
        vRot: (Math.random() - 0.5) * 0.1
    });
}

function checkSlices() {
    if (mouseTrail.length < 2) return;
    const p1 = mouseTrail[mouseTrail.length - 1];
    const p2 = mouseTrail[mouseTrail.length - 2];

    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        const dist = distToSegment(t, p1, p2);
        if (dist < t.radius) {
            createBurst(t.x, t.y, t.type.color);
            if (t.type.isBomb) {
                playSound('bomb');
                health = Math.max(0, health - 25);
                combo = 0;
                document.getElementById('health-val').innerText = health + '%';
                if (health <= 0) gameOver();
            } else {
                playSound('slice');
                combo++;
                score += t.type.points * combo;
                document.getElementById('score-val').innerText = score + ' FLOPS';
                document.getElementById('combo-val').innerText = 'x' + combo;

                clearTimeout(comboTimer);
                comboTimer = setTimeout(() => {
                    combo = 0;
                    document.getElementById('combo-val').innerText = 'x1';
                }, 1200);
            }
            targets.splice(i, 1);
        }
    }
}

function distToSegment(p, v, w) {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function createBurst(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            radius: Math.random() * 4 + 2,
            color: color,
            life: 1.0
        });
    }
}

// Render Trail Shapes
function drawTrail() {
    if (mouseTrail.length < 2) return;

    const shape = shapeSelect.value;
    ctx.save();

    for (let i = 1; i < mouseTrail.length; i++) {
        const p1 = mouseTrail[i - 1];
        const p2 = mouseTrail[i];
        const color = getBladeColor(i, mouseTrail.length);
        const progress = i / mouseTrail.length;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;

        if (shape === 'laser') {
            ctx.lineWidth = progress * 14 + 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        } 
        else if (shape === 'ribbon') {
            const width = progress * 18 + 1;
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
            
            ctx.beginPath();
            ctx.moveTo(p1.x + Math.cos(angle) * width, p1.y + Math.sin(angle) * width);
            ctx.lineTo(p2.x + Math.cos(angle) * width, p2.y + Math.sin(angle) * width);
            ctx.lineTo(p2.x - Math.cos(angle) * width, p2.y - Math.sin(angle) * width);
            ctx.lineTo(p1.x - Math.cos(angle) * width, p1.y - Math.sin(angle) * width);
            ctx.closePath();
            ctx.fill();
        } 
        else if (shape === 'lightning') {
            ctx.lineWidth = 3;
            const midX = (p1.x + p2.x) / 2 + (Math.random() - 0.5) * 16;
            const midY = (p1.y + p2.y) / 2 + (Math.random() - 0.5) * 16;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(midX, midY);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        } 
        else if (shape === 'stars') {
            const size = progress * 12 + 4;
            drawStar(p2.x, p2.y, 5, size, size / 2);
        } 
        else if (shape === 'triangles') {
            const size = progress * 16 + 4;
            ctx.beginPath();
            ctx.moveTo(p2.x, p2.y - size);
            ctx.lineTo(p2.x - size, p2.y + size);
            ctx.lineTo(p2.x + size, p2.y + size);
            ctx.closePath();
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

// Main Frame Game Loop
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Age & fade mouse trail
    for (let i = mouseTrail.length - 1; i >= 0; i--) {
        mouseTrail[i].age -= 0.08;
        if (mouseTrail[i].age <= 0) mouseTrail.splice(i, 1);
    }
    drawTrail();

    // Update Targets
    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        t.x += t.vx;
        t.y += t.vy;
        t.vy += 0.25;
        t.rotation += t.vRot;

        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rotation);

        ctx.shadowColor = t.type.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = t.type.color;

        ctx.beginPath();
        ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.type.icon, 0, 0);

        ctx.restore();

        if (t.y > canvas.height + 50) targets.splice(i, 1);
    }

    // Update Particle Bursts
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    if (isGameRunning) requestAnimationFrame(update);
}

function startGame() {
    score = 0;
    health = 100;
    combo = 0;
    targets = [];
    particles = [];
    isGameRunning = true;

    document.getElementById('score-val').innerText = '0 FLOPS';
    document.getElementById('health-val').innerText = '100%';
    document.getElementById('combo-val').innerText = 'x1';

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');

    clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnTarget, 900);

    requestAnimationFrame(update);
}

function gameOver() {
    isGameRunning = false;
    clearInterval(spawnInterval);
    document.getElementById('final-score').innerText = score + ' FLOPS';
    document.getElementById('gameover-screen').classList.remove('hidden');
}

// Event Listeners for Overlay Buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
