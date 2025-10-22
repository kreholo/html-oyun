const canvas = document.getElementById('gameCanvas');
canvas.width = 800;
canvas.height = 600;
const ctx = canvas.getContext('2d');

const player = {
    x: 100,
    y: 500,
    width: 30,
    height: 30,
    color: '#2ecc71',
    speed: 5,
    velocityY: 0,
    isJumping: false,
    gravity: 0.6,
    jumpsLeft: 2
};

const platforms = [
    { x: 0, y: 550, width: 800, height: 50, color: '#333' },
];

// YENİ: Oyun nesneleri için diziler
let enemies = [];
let clouds = [];
let birds = [];
let coins = [];

// YENİ: Skor ve Zaman
let score = 0;
let startTime = performance.now();
let elapsedTime = 0;
let gameOver = false;

// Oyun Ayarları
let baseSpeed = 4;
let speedIncreaseRate = 0.05;
let enemyTimer = 0;

// DEĞİŞTİ: Düşman gelme süreleri güncellendi
let spikeSpawnRate = 120;
let topDownSpawnRate = 150; // Yukarıdan gelenler için
let leftRightSpawnRate = 240;

// YENİ: Arka plan ve coin zamanlayıcıları
let cloudTimer = 0;
let birdTimer = 0;
let coinTimer = 0;
let cloudSpawnRate = 300;
let birdSpawnRate = 450;
let coinSpawnRate = 200; // Coinlerin gelme sıklığı

let rightPressed = false;
let leftPressed = false;

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
    player.jumpsLeft = 2;
    
    // Tüm dizileri ve sayaçları sıfırla
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

// YENİ: Arka plan ve Coin oluşturma fonksiyonları
function spawnCloud() {
    clouds.push({
        x: canvas.width,
        y: Math.random() * (canvas.height / 3),
        width: Math.random() * 100 + 80,
        height: Math.random() * 40 + 30,
        speedX: -(Math.random() * 0.5 + 0.2),
        color: `rgba(200, 200, 200, ${Math.random() * 0.4 + 0.3})`
    });
}

function spawnBird() {
    birds.push({
        x: canvas.width,
        y: Math.random() * (canvas.height / 2 - 50) + 20,
        width: 20,
        height: 10,
        speedX: -(Math.random() * 2 + 1),
        color: '#663300'
    });
}

function spawnCoin() {
    const coinSize = 15;
    coins.push({
        x: canvas.width,
        y: Math.random() * (platforms[0].y - 200) + 100, // Ulaşılabilir yükseklikte
        width: coinSize,
        height: coinSize,
        speedX: -baseSpeed * 0.8, // Dikenlerden biraz daha yavaş
        color: '#f1c40f' // Sarı renk
    });
}


// --- Düşman Oluşturma Fonksiyonu ---
function spawnEnemy(type, currentSpeed) {
    const enemyColor = '#e74c3c'; // Tüm düşmanlar kırmızı
    
    // Sağdan Gelen Düşmanlar
    if (type === 'right_spike') {
        const enemy = { type, x: canvas.width, width: 20, height: 40, color: enemyColor, speedX: -currentSpeed, speedY: 0 };
        if (Math.random() < 0.5) {
            enemy.y = platforms[0].y - enemy.height;
            enemy.isGroundSpike = true;
        } else {
            enemy.y = Math.random() * (platforms[0].y - 200) + 100;
            enemy.isGroundSpike = false;
        }
        enemies.push(enemy);
    }
    // Soldan Gelen Düşmanlar
    else if (type === 'left_right') {
        enemies.push({ type, x: -40, y: Math.random() * (platforms[0].y - 150) + 50, width: 40, height: 15, color: enemyColor, speedX: currentSpeed * 0.5, speedY: 0 });
    }
    // YENİ: Yukarıdan Gelen Düşmanlar
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
    
    // Zeminle temas ve zıplama hakkı yenileme
    platforms.forEach(platform => {
        if (player.x < platform.x + platform.width && player.x + player.width > platform.x && player.y + player.height >= platform.y && player.y + player.height <= platform.y + player.height + 1 && player.velocityY >= 0) {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            if (player.jumpsLeft < 2) player.jumpsLeft = 2;
            player.isJumping = false;
        }
    });

    // Zamanlayıcıları artır
    enemyTimer++;
    cloudTimer++;
    birdTimer++;
    coinTimer++;

    // --- Nesne Oluşturma ---
    if (enemyTimer % spikeSpawnRate === 0) spawnEnemy('right_spike', currentSpeed);
    if (elapsedTime >= 15 && enemyTimer % topDownSpawnRate === 0) spawnEnemy('top_down', currentSpeed); // DEĞİŞTİ: 15. saniyede başlar
    if (elapsedTime >= 30 && enemyTimer % leftRightSpawnRate === 0) spawnEnemy('left_right', currentSpeed); // DEĞİŞTİ: 30. saniyede başlar
    
    if (cloudTimer % cloudSpawnRate === 0) spawnCloud();
    if (birdTimer % birdSpawnRate === 0) spawnBird();
    if (coinTimer % coinSpawnRate === 0) spawnCoin();

    // --- Güncelleme ve Çarpışma Kontrolü ---
    // Düşmanlar
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        enemy.x += enemy.speedX;
        enemy.y += enemy.speedY;

        if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) {
            gameOver = true;
            return; // Çarpışma anında döngüyü durdur
        }
        if (enemy.x + enemy.width < 0 || enemy.x > canvas.width || enemy.y > canvas.height) {
            enemies.splice(i, 1);
        }
    }
    
    // YENİ: Coinler
    for (let i = coins.length - 1; i >= 0; i--) {
        let coin = coins[i];
        coin.x += coin.speedX;
        
        if (player.x < coin.x + coin.width && player.x + player.width > coin.x && player.y < coin.y + coin.height && player.y + player.height > coin.y) {
            score++; // Skoru artır
            coins.splice(i, 1); // Coini kaldır
            continue;
        }
        if (coin.x + coin.width < 0) {
            coins.splice(i, 1);
        }
    }

    // Arka Plan Öğeleri
    [...clouds, ...birds].forEach(item => {
        item.x += item.speedX;
    });
    clouds = clouds.filter(cloud => cloud.x + cloud.width > 0);
    birds = birds.filter(bird => bird.x + bird.width > 0);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // En arkadan öne doğru çizim
    [...clouds, ...birds].forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x, item.y, item.width, item.height);
    });
    
    // UI (Skor ve Zaman)
    ctx.fillStyle = '#000';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Time: ' + elapsedTime + 's', 10, 30);
    ctx.fillText('Score: ' + score, 10, 60); // YENİ: Skor göstergesi

    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    coins.forEach(coin => { // YENİ: Coinleri çiz
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
        ctx.fillText('Puan: ' + score, canvas.width / 2, canvas.height / 2 + 40); // YENİ: Son skoru göster
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
