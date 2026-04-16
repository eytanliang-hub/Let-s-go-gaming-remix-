/**
 * 飛機戰鬥射擊遊戲 - 最終作業繳交版
 * 特色：Roguelike 升級、固定彈幕 BOSS、霓虹 UI、完整操作說明
 */

let player;
let enemies = [];
let bullets = [];      
let enemyBullets = []; 
let particles = [];
let gameState = "START"; // START, PLAY, LEVEL_UP, GAME_OVER
let score = 0, level = 1, exp = 0, nextLevelExp = 50;
let flashRed = 0; 

// --- 玩家屬性 ---
let shootSpeed = 20; 
let sideGuns = false;
let moveSpeed = 5;
let currentOptions = [];
const allUpgrades = ["火力加強(射速)", "側翼機炮(範圍)", "引擎過載(速度)", "維修(回復HP)"];

function setup() {
  createCanvas(500, 750);
  resetGameParams();
  // 背景星空粒子
  for (let i = 0; i < 40; i++) {
    particles.push({ x: random(width), y: random(height), s: random(1, 3) });
  }
}

function draw() {
  background(10, 15, 30);
  
  if (flashRed > 0) { background(100, 0, 0); flashRed--; }
  drawSpace();

  // 遊戲狀態切換
  if (gameState === "START") {
    showStartScreen();
  } else if (gameState === "PLAY") {
    handleInput();
    runGame();
    drawUI();
  } else if (gameState === "LEVEL_UP") {
    showUpgradeMenu();
  } else if (gameState === "GAME_OVER") {
    showGameOver();
  }
}

// --- 1. 介面模組 (封面、說明、升級、結束) ---

function showStartScreen() {
  fill(0, 180); rect(0, 0, width, height);
  push();
  textAlign(CENTER, CENTER);
  translate(width/2, height/2 - 180);
  let glow = sin(frameCount * 0.1) * 15 + 20;
  noStroke();
  fill(0, 255, 255, 40);
  ellipse(0, 0, 320 + glow, 100 + glow);
  stroke(255); strokeWeight(2); fill(0, 150, 255); textSize(55);
  text("星際生存戰", 0, 0);
  noStroke(); fill(255, 200); textSize(16);
  text("AI PROGRAMMING ASSISTANT", 0, 45);
  pop();

  showHowToPlay();

  push();
  textAlign(CENTER);
  fill(255, 255, 255, sin(frameCount * 0.1) * 155 + 100);
  textSize(22);
  text("按 [空白鍵] 或 [點擊] 開始遊戲", width/2, height/2 + 220);
  pop();
}

function showHowToPlay() {
  push();
  translate(width/2, height/2 + 30);
  rectMode(CENTER);
  fill(20, 30, 50, 210); stroke(0, 255, 255, 150); strokeWeight(2);
  rect(0, 0, 400, 220, 15);
  noStroke(); fill(255); textAlign(CENTER); textSize(22);
  text("【 玩法說明 】", 0, -65);
  textAlign(LEFT); textSize(17); fill(0, 200, 255);
  let th = 32;
  text("• 移動：[W][A][S][D] 或 方向鍵", -160, -20);
  text("• 攻擊：戰機會自動發射子彈", -160, -20 + th);
  text("• 升級：獲得經驗升級，按 [1] 或 [2] 強化", -160, -20 + th*2);
  text("• 魔王：10 級與 50 級將面臨強力 BOSS", -160, -20 + th*3);
  pop();
}

function showUpgradeMenu() {
  fill(0, 220); rectMode(CORNER); rect(0, 0, width, height);
  fill(255); textAlign(CENTER, CENTER); textSize(40);
  text("LEVEL UP!", width / 2, height / 2 - 130);
  
  // 修正後的對齊按鈕
  rectMode(CENTER);
  for (let i = 0; i < currentOptions.length; i++) {
    fill(0, 120, 255); stroke(255); strokeWeight(2);
    rect(width / 2, height / 2 + i * 90, 320, 65, 15);
    noStroke(); fill(255); textSize(22);
    text(currentOptions[i] + ` (按 ${i + 1})`, width / 2, height / 2 + i * 90);
  }
}

function showGameOver() {
  fill(0, 220); rectMode(CORNER); rect(0, 0, width, height);
  fill(255, 0, 0); textAlign(CENTER, CENTER); textSize(50);
  text("MISSION FAILED", width / 2, height / 2 - 30);
  fill(255); textSize(24);
  text("SCORE: " + score, width / 2, height / 2 + 40);
  text("按 [空白鍵] 重啟戰機", width / 2, height / 2 + 90);
}

// --- 2. 遊戲核心邏輯 ---

function runGame() {
  drawPlayer(player.x, player.y);

  // 自動射擊
  if (frameCount % shootSpeed == 0) {
    bullets.push({ x: player.x, y: player.y - 25 });
    if (sideGuns) {
      bullets.push({ x: player.x - 30, y: player.y });
      bullets.push({ x: player.x + 30, y: player.y });
    }
  }

  // 處理玩家子彈
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i]; b.y -= 12;
    fill(0, 255, 255); rectMode(CENTER); rect(b.x, b.y, 5, 15, 2);
    if (b.y < -20) bullets.splice(i, 1);
  }

  // 處理敵方彈幕
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let eb = enemyBullets[i]; eb.x += eb.vx; eb.y += eb.vy;
    fill(255, 255, 0); noStroke(); ellipse(eb.x, eb.y, 10);
    if (dist(eb.x, eb.y, player.x, player.y) < 20) {
      player.hp -= 5; flashRed = 3; enemyBullets.splice(i, 1);
      if (player.hp <= 0) gameState = "GAME_OVER";
    }
    if (eb.y > height || eb.y < -100) enemyBullets.splice(i, 1);
  }

  // 敵人生成 (BOSS 存在時停止生成小怪)
  let hasBoss = enemies.some(e => e.isBoss);
  if (frameCount % 45 == 0 && !hasBoss) generateEnemy();

  // 敵人行為
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    if (e.isBoss) {
      if (e.y < 150) e.y += 2; // BOSS 入場位置
      if (frameCount % e.fireRate == 0) bossFire(e);
    } else e.y += e.speed;
    drawEnemy(e);

    // 碰撞玩家
    if (dist(player.x, player.y, e.x, e.y) < e.size/2 + 20) {
      player.hp -= 20; flashRed = 5;
      if (!e.isBoss) enemies.splice(i, 1);
      if (player.hp <= 0) gameState = "GAME_OVER";
      continue;
    }

    // 子彈擊中敵人
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (dist(bullets[j].x, bullets[j].y, e.x, e.y) < e.size/2 + 10) {
        e.hp -= 1; bullets.splice(j, 1);
        if (e.hp <= 0) { gainExp(e.expValue); score += e.scoreValue; enemies.splice(i, 1); }
        break;
      }
    }
    if (e.y > height + 200) enemies.splice(i, 1);
  }
}

// --- 3. 實體定義與繪圖 ---

function generateEnemy() {
  let type = "NORMAL", hpMult = 1 + (level * 0.2), isBoss = false;
  if (level % 50 === 0) { type = "ULTIMATE"; isBoss = true; }
  else if (level % 10 === 0) { type = "BOSS"; isBoss = true; }
  else if (level % 5 === 0) type = "ELITE";

  let e = { x: isBoss ? width/2 : random(50, width-50), y: -100, type: type, isBoss: isBoss,
            speed: (type === "ELITE") ? 5.5 : 2.5, size: 40, hp: 1 * hpMult,
            expValue: 20, scoreValue: 10, fireRate: 60 };

  if (type === "ELITE") { e.hp *= 7; e.size = 55; e.expValue = 70; }
  if (type === "BOSS") { e.hp *= 45; e.size = 130; e.expValue = 500; e.fireRate = 42; }
  if (type === "ULTIMATE") { e.hp *= 220; e.size = 230; e.expValue = 4000; e.fireRate = 22; }
  e.maxHp = e.hp; enemies.push(e);
}

function bossFire(e) {
  let count = (e.type === "ULTIMATE") ? 20 : 10;
  for (let i = 0; i < count; i++) {
    let angle = TWO_PI / count * i + (frameCount * 0.04);
    enemyBullets.push({ x: e.x, y: e.y, vx: cos(angle) * 4.5, vy: sin(angle) * 4.5 });
  }
}

function drawPlayer(x, y) {
  push(); translate(x, y);
  fill(255, 100, 0); ellipse(0, 25, 12, random(20, 40)); // 噴火
  fill(0, 200, 255); triangle(0, -40, -25, 20, 25, 20); // 機身
  fill(255, 220); ellipse(0, -5, 10, 18); // 艙蓋
  pop();
}

function drawEnemy(e) {
  push(); translate(e.x, e.y);
  if (e.type === "ELITE") fill(255, 215, 0); 
  else if (e.type === "BOSS") fill(180, 0, 255); 
  else if (e.type === "ULTIMATE") fill(255, 0, 0, sin(frameCount*0.4)*100+155); 
  else fill(200, 50, 50);
  triangle(0, e.size/2, -e.size/2, -e.size/2, e.size/2, -e.size/2);
  
  // 敵人血條
  rectMode(CENTER); fill(50); rect(0, -e.size/2 - 20, e.size, 8);
  rectMode(CORNER); fill(255, 0, 0); 
  rect(-e.size/2, -e.size/2 - 24, map(max(0, e.hp), 0, e.maxHp, 0, e.size), 8);
  pop();
}

// --- 4. 系統控制 ---

function keyPressed() {
  if (gameState === "START" && key === ' ') gameState = "PLAY";
  if (gameState === "LEVEL_UP") {
    if (key === '1') applyUpgrade(currentOptions[0]);
    if (key === '2' && currentOptions.length > 1) applyUpgrade(currentOptions[1]);
  }
  if (gameState === "GAME_OVER" && key === ' ') resetGame();
}

function mousePressed() { if (gameState === "START") gameState = "PLAY"; }

function handleInput() {
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) player.x -= moveSpeed;
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) player.x += moveSpeed;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) player.y -= moveSpeed;
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) player.y += moveSpeed;
  player.x = constrain(player.x, 30, width - 30);
  player.y = constrain(player.y, 30, height - 30);
}

function applyUpgrade(choice) {
  if (choice.includes("射速")) shootSpeed = max(6, shootSpeed - 4);
  if (choice.includes("側翼")) sideGuns = true;
  if (choice.includes("速度")) moveSpeed += 1.5;
  if (choice.includes("維修")) player.hp = min(player.maxHp, player.hp + 50);
  exp = 0; nextLevelExp += 60; level++; gameState = "PLAY";
}

function gainExp(amt) {
  exp += amt;
  if (exp >= nextLevelExp) {
    gameState = "LEVEL_UP";
    currentOptions = shuffle(allUpgrades).slice(0, 2);
  }
}

function resetGame() {
  resetGameParams(); score = 0; level = 1; shootSpeed = 20; sideGuns = false; moveSpeed = 5;
  gameState = "PLAY";
}

function resetGameParams() {
  player = { x: width/2, y: height-100, hp: 100, maxHp: 100 };
  enemies = []; bullets = []; enemyBullets = []; exp = 0; nextLevelExp = 50;
}

function drawSpace() {
  fill(255, 150); noStroke();
  for (let p of particles) { ellipse(p.x, p.y, p.s); p.y += p.s * 1.5; if (p.y > height) p.y = 0; }
}

function drawUI() {
  rectMode(CORNER); fill(255); textAlign(LEFT, TOP); textSize(18);
  text(`等級: ${level}  得分: ${score}`, 20, 25);
  // 頂部經驗條
  fill(40); rect(0, 0, width, 8);
  fill(0, 200, 255); rect(0, 0, map(exp, 0, nextLevelExp, 0, width), 8);
  // 底部 HP 條
  fill(50); rect(85, height-40, 160, 18, 5);
  fill(0, 255, 120); rect(85, height-40, map(max(0, player.hp), 0, player.maxHp, 0, 160), 18, 5);
  fill(255); text("HP", 45, height-42);
}

function shuffle(array) { return array.sort(() => Math.random() - 0.5); }

