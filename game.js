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
    jumpsLeft: 2 // Çift zıplama hakkı
};

const platforms = [
    { x: 0, y: 550, width: 800, height: 50, color: '#333' },
];

let enemies = [];
// YENİ: Arka plan öğeleri için diziler
let clouds = [];
let birds = [];

let startTime = performance.now();
let elapsedTime = 0;
let gameOver = false;

let baseSpeed = 4;
let speedIncreaseRate = 0.05;
let enemyTimer = 0;

let spikeSpawnRate = 120;
let leftRightSpawnRate = 240;

// YENİ: Arka plan öğeleri için zamanlayıcılar
let cloudTimer = 0;
let birdTimer = 0;
let cloudSpawnRate = 300; // Her 5 saniyede bir bulut
let birdSpawnRate = 450;  // Her 7.5 saniyede bir kuş

let rightPressed = false;
let leftPressed = false;

// YENİ: Oyuncunun ulaşabileceği maksimum zıplama yüksekliğini hesaplama
// Bu, düşman konumlandırmasında kullanılacak.
function getPlayerMaxJumpHeight() {
    // Kaba bir tahmin: Bir zıplamada ne kadar yükselirsin?
    // Max velocityY * (max velocityY / gravity) / 2
    // İlk zıplama: -12, ikincisi -10
    let maxInitialVel = 12; // İlk zıplama gücü
    let maxDoubleJumpVel = 10; // İkinci zıplama gücü

    // Yaklaşık olarak maksimum yükseklik
    let height1 = (maxInitialVel * maxInitialVel) / (2 * player.gravity);
    let height2 = (maxDoubleJumpVel * maxDoubleJumpVel) / (2 * player.gravity);

    return height1 + height2 + player.height; // Karakterin kendi yüksekliğini de ekle
}
const playerMaxReach = getPlayerMaxJumpHeight();


// --- Olay Dinleyicileri ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if ((e.key === ' ' || e.key === 'ArrowUp') && player.jumpsLeft > 0 && !gameOver) {
        if (!player.isJumping) {
            player.velocityY = -12;
        } else {
            player.velocityY = -10;
        }
        player.isJumping = true;
        player.jumpsLeft--;
    } else if ((e.key === 'r' || e.key === 'R') && gameOver) {
        resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
    if (e.key === ' ' || e.key === 'ArrowUp') {
        if (player.velocityY < 0) {
            player.velocityY *= 0.4;
        }
    }
});

// --- Oyun Sıfırlama ---
function resetGame() {
    player.x = 100;
    player.y = 500;
    player.velocityY = 0;
    player.isJumping = false;
    player.jumpsLeft = 2;
    enemies = [];
    clouds = []; // YENİ: Bulutları sıfırla
    birds = [];  // YENİ: Kuşları sıfırla
    startTime = performance.now();
    elapsedTime = 0;
    spikeSpawnRate = 120;
    leftRightSpawnRate = 240;
    enemyTimer = 0;
    cloudTimer = 0; // YENİ: Bulut zamanlayıcısını sıfırla
    birdTimer = 0;  // YENİ: Kuş zamanlayıcısını sıfırla
    gameOver = false;
    gameLoop();
}

// YENİ: Bulut oluşturma fonksiyonu
function spawnCloud() {
    const cloud = {
        x: canvas.width,
        y: Math.random() * (canvas.height / 3), // Üst üçte birlik alanda
        width: Math.random() * 100 + 80, // 80-180 arası genişlik
        height: Math.random() * 40 + 30, // 30-70 arası yükseklik
        speedX: -(Math.random() * 0.5 + 0.2), // Yavaş hız
        opacity: Math.random() * 0.4 + 0.3, // 0.3 - 0.7 arası yarı saydamlık
        color: `rgba(200, 200, 200, ${Math.random() * 0.4 + 0.3})` // Gri ton, yarı saydam
    };
    clouds.push(cloud);
}

// YENİ: Kuş oluşturma fonksiyonu (Basit blok olarak)
function spawnBird() {
    const bird = {
        x: canvas.width,
        y: Math.random() * (canvas.height / 2 - 50) + 20, // Üst yarıda, biraz daha yukarıda
        width: 20,
        height: 10,
        speedX: -(Math.random() * 2 + 1), // Bulutlardan daha hızlı
        color: '#663300' // Kahverengi
    };
    birds.push(bird);
}


// --- Düşman Oluşturma Fonksiyonu ---
function spawnEnemy(type, currentSpeed) {
    const enemyColor = '#e74c3c';

    // Sağdan Gelen Düşmanlar (Spike)
    if (type === 'right_spike') {
        let clusterSize = 1;
        const rand = Math.random();
        if (rand < 0.1) clusterSize = 3;
        else if (rand < 0.3) clusterSize = 2;

        for (let i = 0; i < clusterSize; i++) {
            const enemy = { type: type, x: 0, y: 0, width: 20, height: 40, color: enemyColor, speedX: -currentSpeed, speedY: 0 };
            enemy.x = canvas.width + (i * 25);

            if (Math.random() < 0.2) {
                enemy.width = 40;
                enemy.height = 60;
            }

            // YENİ: Y pozisyonunu oyuncunun ulaşabileceği yere göre ayarla
            const minEnemyY = platforms[0].y - playerMaxReach - 20; // Player'ın en üst noktası + biraz boşluk
            const maxEnemyY = platforms[0].y - enemy.height; // Zemin seviyesi
            
            if (Math.random() < 0.5) { // Yerdeki diken
                enemy.y = maxEnemyY;
                enemy.isGroundSpike = true;
            } else { // Havadaki diken
                // Oyuncunun ulaşabileceği ve zeminden en az 50px yukarıda
                enemy.y = Math.random() * (maxEnemyY - enemy.height - 50 - minEnemyY) + minEnemyY;
                enemy.isGroundSpike = false;
            }
            // Çok yukarılarda görünmemesi için ek kontrol
            enemy.y = Math.max(minEnemyY, enemy.y);
            enemies.push(enemy);
        }
    }
    // Soldan Gelen Düşmanlar (Block)
    else if (type === 'left_right') {
        const enemy = { type: type, x: 0, y: 0, width: 40, height: 15, color: enemyColor, speedX: currentSpeed * 0.5, speedY: 0 };
        enemy.x = -enemy.width;
        
        // YENİ: Y pozisyonunu oyuncunun ulaşabileceği yere göre ayarla
        const minEnemyY = platforms[0].y - playerMaxReach - 20;
        const maxEnemyY = platforms[0].y - enemy.height - 50; // Zeminden biraz yukarıda

        enemy.y = Math.random() * (maxEnemyY - minEnemyY) + minEnemyY;
        // Çok yukarılarda görünmemesi için ek kontrol
        enemy.y = Math.max(minEnemyY, enemy.y);
        enemies.push(enemy);
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

    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + platform.height + 1 &&
            player.velocityY >= 0
        ) {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            if (player.jumpsLeft < 2) {
                player.jumpsLeft = 2;
            }
            player.isJumping = false;
        }
    });

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    enemyTimer++;
    cloudTimer++; // YENİ: Bulut zamanlayıcısını güncelle
    birdTimer++;  // YENİ: Kuş zamanlayıcısını güncelle

    // Sağdan Gelenler
    if (enemyTimer % spikeSpawnRate === 0) {
        const lastSpike = enemies.slice().reverse().find(e => e.type === 'right_spike');
        const safeZone = 120;
        if (!lastSpike || lastSpike.x < canvas.width - safeZone) {
            spawnEnemy('right_spike', currentSpeed);
        }
        spikeSpawnRate = Math.max(40, spikeSpawnRate - Math.floor(elapsedTime / 15));
    }
    
    // Soldan Gelenler (60 saniye sonra aktif)
    if (elapsedTime >= 60 && enemyTimer % leftRightSpawnRate === 0) {
        spawnEnemy('left_right', currentSpeed);
        leftRightSpawnRate = Math.max(150, leftRightSpawnRate - Math.floor((elapsedTime - 60) / 10));
    }

    // YENİ: Bulutları ve Kuşları oluştur
    if (cloudTimer % cloudSpawnRate === 0) {
        spawnCloud();
    }
    if (birdTimer % birdSpawnRate === 0) {
        spawnBird();
    }


    for (let i = 0; i < enemies.length; i++) {
        let enemy = enemies[i];
        enemy.x += enemy.speedX;
        enemy.y += enemy.speedY;

        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            gameOver = true;
            break;
        }

        let remove = false;
        if ((enemy.speedX < 0 && enemy.x + enemy.width < 0) || (enemy.speedX > 0 && enemy.x > canvas.width)) {
            remove = true;
        }
        if (remove) {
            enemies.splice(i, 1);
            i--;
        }
    }

    // YENİ: Bulutları güncelle ve ekran dışına çıkanları temizle
    for (let i = 0; i < clouds.length; i++) {
        clouds[i].x += clouds[i].speedX;
        if (clouds[i].x + clouds[i].width < 0) {
            clouds.splice(i, 1);
            i--;
        }
    }

    // YENİ: Kuşları güncelle ve ekran dışına çıkanları temizle
    for (let i = 0; i < birds.length; i++) {
        birds[i].x += birds[i].speedX;
        if (birds[i].x + birds[i].width < 0) {
            birds.splice(i, 1);
            i--;
        }
    }
}

function drawEnemy(enemy) {
    ctx.fillStyle = enemy.color;
    if (enemy.type === 'right_spike' && enemy.isGroundSpike) {
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y + enemy.height);
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y);
        ctx.closePath();
        ctx.fill();
    } else {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // YENİ: Önce bulutları çiz (arkada olmalı)
    clouds.forEach(cloud => {
        ctx.fillStyle = cloud.color;
        // Basit dikdörtgen bulutlar
        ctx.fillRect(cloud.x, cloud.y, cloud.width, cloud.height);
        // İsterseniz daha karmaşık bulut şekilleri için oval veya birden fazla daire kullanabilirsiniz
    });

    // YENİ: Kuşları çiz
    birds.forEach(bird => {
        ctx.fillStyle = bird.color;
        ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    });

    ctx.fillStyle = '#000';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Time: ' + elapsedTime + 's', 10, 30);

    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    enemies.forEach(drawEnemy);

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('OYUN BİTTİ', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '24px Arial';
        ctx.fillText('Hayatta Kalma Süresi: ' + elapsedTime + ' saniye', canvas.width / 2, canvas.height / 2 + 30);
        ctx.fillText('Yeniden başlamak için R tuşuna basın', canvas.width / 2, canvas.height / 2 + 70);
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
