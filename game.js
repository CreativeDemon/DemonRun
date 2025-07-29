const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w > h) {
    canvas.width = w;
    canvas.height = h;
  } else {
    canvas.width = h;
    canvas.height = w;
  }
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Game constants
const gravity = 0.4;
const jumpForce = -8;
const doubleJumpForce = -6;
const groundHeight = 60;
const scale = 0.6;
const safeJumpHeight = 150; // Minimum vertical space needed for jumps

// Enemy types
const ENEMY_TYPES = {
  WALKER: 0,
  SHOOTER: 1,
  JUMPER: 2
};

let player = {
  x: 100,
  y: 0,
  w: 30 * scale,
  h: 30 * scale,
  ySpeed: 0,
  onGround: false,
  jumpsRemaining: 2, // Double jump enabled
  rollTimer: 0,
  invincibleTimer: 0
};

player.y = canvas.height - groundHeight - player.h;

let platforms = [
  { x: 0, y: canvas.height - groundHeight, w: canvas.width * 2, h: groundHeight }
];

let enemies = [];
let bullets = [];
let gameOver = false;
let score = 0;
let spawnRate = 120;
let lastSpawn = 0;
let lastPlatformEnd = platforms[0].w;

function getSafeSpawnPosition() {
  // Ensure enemies spawn with enough jump space
  const minDistanceFromPlayer = 300;
  const minGapBetweenEnemies = 150;
  
  let spawnX = canvas.width;
  if (enemies.length > 0) {
    const lastEnemy = enemies[enemies.length - 1];
    spawnX = Math.max(spawnX, lastEnemy.x + lastEnemy.w + minGapBetweenEnemies);
  }
  
  // Make sure player has space to jump over the enemy
  spawnX = Math.max(spawnX, player.x + minDistanceFromPlayer);
  
  return spawnX;
}

function spawnEnemy() {
  const typeRoll = Math.random();
  const spawnX = getSafeSpawnPosition();
  
  // Don't spawn if there's not enough space
  if (spawnX > canvas.width + 300) return;
  
  let enemy;
  const baseHeight = canvas.height - groundHeight - 30 * scale;
  
  if (typeRoll < 0.6) { // 60% walkers
    enemy = {
      type: ENEMY_TYPES.WALKER,
      x: spawnX,
      y: baseHeight,
      w: 30 * scale,
      h: 30 * scale,
      speed: 2 + Math.random(),
      color: "#ff0000",
      hitPoints: 1
    };
  } 
  else if (typeRoll < 0.9) { // 30% shooters
    enemy = {
      type: ENEMY_TYPES.SHOOTER,
      x: spawnX,
      y: baseHeight,
      w: 30 * scale,
      h: 30 * scale,
      speed: 1.5,
      cooldown: 0,
      color: "#00ff00",
      hitPoints: 2
    };
  }
  else { // 10% jumpers
    enemy = {
      type: ENEMY_TYPES.JUMPER,
      x: spawnX,
      y: baseHeight,
      w: 30 * scale,
      h: 30 * scale,
      speed: 2.5,
      jumpTimer: 0,
      ySpeed: 0,
      color: "#0000ff",
      hitPoints: 3
    };
  }
  
  enemies.push(enemy);
}

function shoot(enemy) {
  bullets.push({
    x: enemy.x,
    y: enemy.y + enemy.h / 2,
    w: 8,
    h: 8,
    speed: 4,
    color: "#ffff00"
  });
}

function update() {
  if (gameOver) return;
  
  // Apply gravity
  player.ySpeed += gravity;
  player.y += player.ySpeed;
  
  // Ground/platform collision
  if (player.y + player.h >= canvas.height - groundHeight) {
    player.y = canvas.height - groundHeight - player.h;
    player.ySpeed = 0;
    player.jumpsRemaining = 2; // Reset jumps when on ground
    player.onGround = true;
  } else {
    player.onGround = false;
  }
  
  // Move platforms (scroll effect)
  platforms.forEach(p => p.x -= 2);
  lastPlatformEnd = platforms[platforms.length - 1].x + platforms[platforms.length - 1].w;
  
  if (lastPlatformEnd < canvas.width) {
    const platformWidth = 200 + Math.random() * 100;
    platforms.push({
      x: canvas.width,
      y: canvas.height - groundHeight,
      w: platformWidth,
      h: groundHeight
    });
    lastPlatformEnd = canvas.width + platformWidth;
  }
  
  // Remove off-screen platforms
  if (platforms.length > 3 && platforms[0].x + platforms[0].w < 0) {
    platforms.shift();
  }
  
  // Enemy spawning
  lastSpawn++;
  if (lastSpawn >= spawnRate) {
    spawnEnemy();
    lastSpawn = 0;
    score++;
    
    // Increase difficulty gradually
    if (score % 10 === 0 && spawnRate > 60) {
      spawnRate -= 3;
    }
  }
  
  // Enemies
  enemies.forEach(e => {
    e.x -= e.speed;
    
    // Type-specific behavior
    switch(e.type) {
      case ENEMY_TYPES.SHOOTER:
        e.cooldown--;
        if (Math.abs(player.x - e.x) < 250 && e.cooldown <= 0) {
          shoot(e);
          e.cooldown = 80 + Math.random() * 40;
        }
        break;
        
      case ENEMY_TYPES.JUMPER:
        e.jumpTimer--;
        if (e.jumpTimer <= 0 && Math.abs(player.x - e.x) < 150) {
          e.ySpeed = -8;
          e.jumpTimer = 60 + Math.random() * 40;
        }
        e.ySpeed += gravity;
        e.y += e.ySpeed;
        if (e.y + e.h > canvas.height - groundHeight) {
          e.y = canvas.height - groundHeight - e.h;
          e.ySpeed = 0;
        }
        break;
    }
  });
  
  // Player attack during roll
  if (player.rollTimer > 0) {
    enemies.forEach(e => {
      if (player.x < e.x + e.w && player.x + player.w > e.x &&
          player.y < e.y + e.h && player.y + player.h > e.y) {
        e.hitPoints--;
      }
    });
  }
  
  enemies = enemies.filter(e => e.x + e.w > 0 && e.hitPoints > 0);
  
  // Bullets
  bullets.forEach(b => b.x -= b.speed);
  bullets = bullets.filter(b => b.x + b.w > 0);
  
  // Collision checks
  if (player.invincibleTimer <= 0) {
    enemies.forEach(e => {
      if (player.x < e.x + e.w && player.x + player.w > e.x &&
        player.y < e.y + e.h && player.y + player.h > e.y) {
        gameOver = true;
      }
    });
    
    bullets.forEach(b => {
      if (player.x < b.x + b.w && player.x + player.w > b.x &&
        player.y < b.y + b.h && player.y + player.h > b.y) {
        gameOver = true;
      }
    });
  } else {
    player.invincibleTimer--;
  }
  
  // Roll timer
  if (player.rollTimer > 0) player.rollTimer--;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Platforms
  ctx.fillStyle = "#664422";
  platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));
  
  // Player
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 5) % 2 === 0) {
    ctx.fillStyle = "#ffffff"; // Flash when invincible
  } else {
    ctx.fillStyle = "#00ffff";
  }
  
  if (player.rollTimer > 0) {
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
    ctx.rotate((10 - player.rollTimer) * 0.3);
    ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
    ctx.restore();
  } else {
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }
  
  // Enemies
  enemies.forEach(e => {
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.w, e.h);
    
    // Visual indicators
    if (e.type === ENEMY_TYPES.SHOOTER) {
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(e.x + e.w/2, e.y + e.h/2, e.w/4, 0, Math.PI*2);
      ctx.fill();
    }
    else if (e.type === ENEMY_TYPES.JUMPER) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(e.x + e.w/4, e.y + e.h/4, e.w/2, e.h/4);
    }
    
    // Health bars
    if (e.hitPoints < (e.type === ENEMY_TYPES.WALKER ? 1 : e.type === ENEMY_TYPES.SHOOTER ? 2 : 3)) {
      ctx.fillStyle = "#f00";
      ctx.fillRect(e.x, e.y - 10, e.w, 5);
      ctx.fillStyle = "#0f0";
      const maxHP = e.type === ENEMY_TYPES.WALKER ? 1 : e.type === ENEMY_TYPES.SHOOTER ? 2 : 3;
      ctx.fillRect(e.x, e.y - 10, e.w * (e.hitPoints / maxHP), 5);
    }
  });
  
  // Bullets
  bullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });
  
  // Score
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px monospace";
  ctx.fillText("Score: " + score, 20, 30);
  
  // Jump indicator
  ctx.fillStyle = player.jumpsRemaining > 0 ? "#0f0" : "#f00";
  ctx.fillText("Jumps: " + player.jumpsRemaining, 20, 50);
  
  // Game Over
  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 20);
    ctx.textAlign = "left";
    
    ctx.font = "16px monospace";
    ctx.fillText("Tap to restart", canvas.width / 2 - 50, canvas.height / 2 + 60);
  }
}

function restartGame() {
  player = {
    x: 100,
    y: canvas.height - groundHeight - 30 * scale,
    w: 30 * scale,
    h: 30 * scale,
    ySpeed: 0,
    onGround: true,
    jumpsRemaining: 2,
    rollTimer: 0,
    invincibleTimer: 0
  };
  
  platforms = [
    { x: 0, y: canvas.height - groundHeight, w: canvas.width * 2, h: groundHeight }
  ];
  lastPlatformEnd = platforms[0].w;
  
  enemies = [];
  bullets = [];
  gameOver = false;
  score = 0;
  spawnRate = 120;
  lastSpawn = 0;
}

canvas.addEventListener("touchstart", () => {
  if (gameOver) {
    restartGame();
    return;
  }
  
  // Double jump logic
  if (player.jumpsRemaining > 0) {
    player.ySpeed = player.jumpsRemaining === 2 ? jumpForce : doubleJumpForce;
    player.jumpsRemaining--;
    
    // Roll effect on second jump
    if (player.jumpsRemaining === 0) {
      player.rollTimer = 10;
      player.invincibleTimer = 15; // Brief invincibility during roll
    }
  }
});

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();