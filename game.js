const canvas = document.getElementById('gameCanvas');
canvas.width = 800;
canvas.height = 600;
const ctx = canvas.getContext('2d');

const player = {
    x: 100,
    y: 500,
    width: 30,
    height: 30,
    color: '#2ecc71', // Karakter yeşil
    speed: 5,
    velocityY: 0,
    isJumping: false,
    gravity: 0.6,
    jumpsLeft: 3 // Triple Jump
};

const platforms = [
    { x: 0, y: 550, width: 800, height: 50, color: '#333333' }, // DÜZELTİLDİ: Zemin rengi siyah yapıldı
];

let enemies = [];
let clouds = [];
let birds = [];
let coins = [];

let score = 0;
let startTime = performance.now();
let elapsedTime = 0;
let gameOver = false;

let baseSpeed = 4.5;
let speedIncreaseRate = 0.07;
let enemyTimer = 0;

let spikeSpawnRate = 40;
let topDownSpawnRate = 70;
let leftRightSpawnRate = 90;

let cloudTimer = 0;
let birdTimer = 0;
let coinTimer = 0;
let cloudSpawnRate = 300;
let birdSpawnRate = 450;
let coinSpawnRate = 200;

let rightPressed = false;
let leftPressed = false;

function getPlayerMaxReach() {
    const jump1Height = (12 * 12) / (2 * player.gravity);
    const jump2Height = (10 * 10) / (2 * player.gravity);
    const jump3Height = (10 * 10) / (2 * player.gravity);
    return platforms[0].y - (jump1Height + jump2Height + jump3Height);
}
const playerMaxJumpY = getPlayerMaxReach();

// --- Olay Dinleyicileri ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
    else if ((e.key === ' ' || e.key === 'ArrowUp') && player.jumpsLeft > 0 && !gameOver) {
        player.velocityY = (player.isJumping) ? -10 : -12;
        player.isJumping = true;
        player.jumpsLeft--;
    } else if ((e.key === 'r' || e.key === 'R') && gameOver) {
        resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
    if ((e.key === ' ' || e.key === 'ArrowUp') && player.velocityY < 0) {
        player.velocityY *= 0.4;
    }
});

// --- Oyun Sıfırlama ---
function resetGame() {
    player.x = 100;
    player.y = 500;
    player.velocityY = 0;
    player.isJumping = false;
    player.jumpsLeft = 3;
    
    enemies = [];
    clouds = [];
    birds = [];
    coins = [];
    score = 0;
    
    startTime = performance.now();
    elapsedTime = 0;
    enemyTimer = cloudTimer = birdTimer = coinTimer = 0;
    
    gameOver = false;
    gameLoop();
}

// --- Nesne Oluşturma Fonksiyonları ---
function spawnCloud() {
    clouds.push({
        x: canvas.width,
        y: Math.random() * (canvas.height / 3),
        width: Math.random() * 100 + 80,
        height: Math.random() * 40 + 30,
        speedX: -(Math.random() * 0.5 + 0.2),
        color: `rgba(255, 255, 255, ${Math.random() * 0.4 + 0.5})`
    });
}

function spawnBird() {
    birds.push({
        x: canvas.width,
        y: Math.random() * (canvas.height / 2 - 50) + 20,
        width: 20,
        height: 10,
        speedX: -(Math.random() * 2 + 1),
        color: '#5C4033'
    });
}

function spawnCoin() {
    coins.push({
        x: canvas.width,
        y: Math.random() * (platforms[0].y - 250) + 150,
        width: 15,
        height: 15,
        speedX: -baseSpeed * 0.8,
        color: '#f1c40f'
    });
}

function spawnEnemy(type, currentSpeed) {
    const enemyColor = '#e74c3c';
    const cloudZoneHeight = canvas.height / 3;

    // Sağdan Gelen Düşmanlar
    if (type === 'right_spike') {
        const enemy = { type, x: canvas.width, width: 20, height: 40, color: enemyColor, speedX: -currentSpeed, speedY: 0 };
        if (Math.random() < 0.4) {
            enemy.y = platforms[0].y - enemy.height;
            enemy.isGroundSpike = true;
        } else {
            const minY = Math.max(playerMaxJumpY, cloudZoneHeight);
            enemy.y = Math.random() * (platforms[0].y - enemy.height - minY) + minY;
            enemy.isGroundSpike = false;
        }
        enemies.push(enemy);
    }
    // Soldan Gelen Düşmanlar
    else if (type === 'left_right') {
        const enemy = { type, x: -40, width: 40, height: 15, color: enemyColor, speedX: currentSpeed * 0.6, speedY: 0 };
        const minY = Math.max(playerMaxJumpY, cloudZoneHeight);
        enemy.y = Math.random() * (platforms[0].y - enemy.height - 50 - minY) + minY;
        enemies.push(enemy);
    }
    // Yukarıdan Gelen Düşmanlar
    else if (type === 'top_down') {
        enemies.push({ type, x: Math.random() * (canvas.width - 30), y: -30, width: 30, height: 30, color: enemyColor, speedX: 0, speedY: currentSpeed * 0.75 });
    }
}

function update() {
    if (gameOver) return;

    const now = performance.now();
    const newElapsedTime = Math.floor((now - startTime) / 1000);
    const currentSpeed = baseSpeed + newElapsedTime * speedIncreaseRate;

    if (newElapsedTime !== elapsedTime) {
        elapsedTime = newElapsedTime;
    }

    if (rightPressed) player.x += player.speed;
    if (leftPressed) player.x -= player.speed;

    player.velocityY += player.gravity;
    player.y += player.velocityY;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    
    // DÜZELTİLDİ: Platform çarpışma mantığı daha güvenilir hale getirildi
    platforms.forEach(platform => {
        // Çarpışma algılandı mı?
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height > platform.y && // Oyuncu platform seviyesinin üstünde/içinde mi?
            player.y < platform.y + platform.height && // Oyuncu platformun altından geçmiyor mu?
            player.velocityY >= 0 // Oyuncu aşağı doğru hareket ediyor mu?
        ) {
            // Oyuncuyu platformun tam üzerine oturt
            player.y = platform.y - player.height;
            player.velocityY = 0; // Düşmeyi durdur
            // Zıplama haklarını yenile
            if (player.jumpsLeft < 3) player.jumpsLeft = 3;
            player.isJumping = false;
        }
    });


    enemyTimer++;
    cloudTimer++;
    birdTimer++;
    coinTimer++;

    if (enemyTimer % spikeSpawnRate === 0) spawnEnemy('right_spike', currentSpeed);
    if (elapsedTime >= 15 && enemyTimer % topDownSpawnRate === 0) spawnEnemy('top_down', currentSpeed);
    if (elapsedTime >= 30 && enemyTimer % leftRightSpawnRate === 0) spawnEnemy('left_right', currentSpeed);
    
    if (cloudTimer % cloudSpawnRate === 0) spawnCloud();
    if (birdTimer % birdSpawnRate === 0) spawnBird();
    if (coinTimer % coinSpawnRate === 0) spawnCoin();

    // Düşman Çarpışma Kontrolü
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        enemy.x += enemy.speedX;
        enemy.y += enemy.speedY;

        if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) {
            gameOver = true;
            return;
        }
        if (enemy.x + enemy.width < 0 || enemy.x > canvas.width || enemy.y > canvas.height) {
            enemies.splice(i, 1);
        }
    }
    
    // Coin Toplama
    for (let i = coins.length - 1; i >= 0; i--) {
        let coin = coins[i];
        coin.x += coin.speedX;
        
        if (player.x < coin.x + coin.width && player.x + player.width > coin.x && player.y < coin.y + coin.height && player.y + player.height > coin.y) {
            score++;
            coins.splice(i, 1);
            continue;
        }
        if (coin.x + coin.width < 0) {
            coins.splice(i, 1);
        }
    }

    // Arka Plan Öğeleri
    [...clouds, ...birds].forEach(item => item.x += item.speedX);
    clouds = clouds.filter(cloud => cloud.x + cloud.width > 0);
    birds = birds.filter(bird => bird.x + bird.width > 0);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    [...clouds, ...birds].forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x, item.y, item.width, item.height);
    });
    
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Time: ' + elapsedTime + 's', 10, 30);
    ctx.fillText('Score: ' + score, 10, 60);

    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    coins.forEach(coin => {
        ctx.fillStyle = coin.color;
        ctx.beginPath();
        ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        if (enemy.isGroundSpike) {
             ctx.beginPath();
             ctx.moveTo(enemy.x, enemy.y + enemy.height);
             ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
             ctx.lineTo(enemy.x + enemy.width / 2, enemy.y);
             ctx.closePath();
             ctx.fill();
        } else {
             ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
    });

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('OYUN BİTTİ', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = '24px Arial';
        ctx.fillText('Süre: ' + elapsedTime + ' saniye', canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillText('Puan: ' + score, canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText('Yeniden başlamak için R tuşuna basın', canvas.width / 2, canvas.height / 2 + 80);
    }
}

function gameLoop() {
    update();
    draw();
    if (!gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

gameLoop();
