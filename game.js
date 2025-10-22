const canvas = document.getElementById('gameCanvas');
canvas.width = 800;
canvas.height = 600;
const ctx = canvas.getContext('2d');

const player = {
    x: 100,
    y: 500,
    width: 30,
    height: 30,
    color: '#2ecc71', // DEĞİŞTİ: Karakter rengi yeşil
    speed: 5,
    velocityY: 0,
    isJumping: false, // Yerde olup olmadığını kontrol etmek için hala kullanışlı
    gravity: 0.6,    // Zıplama hissini iyileştirmek için biraz artırıldı
    jumpsLeft: 2     // YENİ: Çift zıplama için sayaç
};

const platforms = [
    { x: 0, y: 550, width: 800, height: 50, color: '#333' },
];

let enemies = [];

let startTime = performance.now();
let elapsedTime = 0;
let gameOver = false;

let baseSpeed = 4;
let speedIncreaseRate = 0.05;
let enemyTimer = 0;

// Düşman oluşum sıklıkları (topDownSpawnRate kaldırıldı)
let spikeSpawnRate = 120;
let leftRightSpawnRate = 240;

let rightPressed = false;
let leftPressed = false;

// --- Olay Dinleyicileri ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if ((e.key === ' ' || e.key === 'ArrowUp') && player.jumpsLeft > 0 && !gameOver) { // DEĞİŞTİ: Çift zıplama kontrolü
        // YENİ: Her zıplamada başlangıçta aynı yüksekliği veririz, tuş basılı tutulursa artar
        if (!player.isJumping) { // Eğer yere basıyorsa ilk zıplama
            player.velocityY = -12;
        } else { // Havadaysa ve double jump yapıyorsa
            player.velocityY = -10; // İkinci zıplama biraz daha az güçlü olabilir
        }
        player.isJumping = true; // Zıplama durumunu işaretle
        player.jumpsLeft--;    // Zıplama hakkı düşürüldü
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

    // DEĞİŞTİ: Değişken zıplama yüksekliği için
    if (e.key === ' ' || e.key === 'ArrowUp') {
        // Eğer oyuncu hala yükseliyorsa (hızı negatifse), zıplamayı kısa kes
        if (player.velocityY < 0) {
            player.velocityY *= 0.4; // Yükselme hızını azalt
        }
    }
});

// --- Oyun Sıfırlama ---
function resetGame() {
    player.x = 100;
    player.y = 500;
    player.velocityY = 0;
    player.isJumping = false;
    player.jumpsLeft = 2; // YENİ: Zıplama hakkını sıfırla
    enemies = [];
    startTime = performance.now();
    elapsedTime = 0;

    spikeSpawnRate = 120;
    leftRightSpawnRate = 240; // topDownSpawnRate kaldırıldı
    enemyTimer = 0;

    gameOver = false;
    gameLoop();
}

// --- Düşman Oluşturma Fonksiyonu ---
function spawnEnemy(type, currentSpeed) {
    // DEĞİŞTİ: Tüm düşmanların rengi kırmızı olacak
    const enemyColor = '#e74c3c';

    // Sağdan Gelen Düşmanlar (Spike - Yer veya Havada)
    if (type === 'right_spike') {
        let clusterSize = 1;
        const rand = Math.random();
        if (rand < 0.1) clusterSize = 3;
        else if (rand < 0.3) clusterSize = 2;

        for (let i = 0; i < clusterSize; i++) {
            const enemy = { type: type, x: 0, y: 0, width: 20, height: 40, color: enemyColor, speedX: -currentSpeed, speedY: 0 };
            
            enemy.x = canvas.width + (i * 25);

            // Rastgele daha büyük dikenler oluştur
            if (Math.random() < 0.2) {
                enemy.width = 40;
                enemy.height = 60;
            }

            // %50 Yere sabit, %50 havada yüzen düşman
            if (Math.random() < 0.5) {
                enemy.y = platforms[0].y - enemy.height;
                enemy.isGroundSpike = true;
            } else {
                const minY = 50;
                const maxY = platforms[0].y - enemy.height - 50;
                enemy.y = Math.random() * (maxY - minY) + minY;
                enemy.isGroundSpike = false;
            }
            enemies.push(enemy);
        }
    }
    // Soldan Gelen Düşmanlar (60s sonrası)
    else if (type === 'left_right') {
        const enemy = { type: type, x: 0, y: 0, width: 40, height: 15, color: enemyColor, speedX: currentSpeed * 0.5, speedY: 0 }; // DEĞİŞTİ: Renk kırmızı
        enemy.x = -enemy.width;
        const minY = 100;
        const maxY = platforms[0].y - enemy.height - 50;
        enemy.y = Math.random() * (maxY - minY) + minY;
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
            // YENİ: Yere indiğinde zıplama hakkını yenile ve isJumping'i sıfırla
            if (player.jumpsLeft < 2) {
                player.jumpsLeft = 2;
            }
            player.isJumping = false;
        }
    });

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    enemyTimer++;

    // 1. Sağdan Gelen Düşmanlar
    if (enemyTimer % spikeSpawnRate === 0) {
        const lastSpike = enemies.slice().reverse().find(e => e.type === 'right_spike');
        const safeZone = 120; // Oyuncuya tepki süresi tanımak için boşluk

        if (!lastSpike || lastSpike.x < canvas.width - safeZone) {
            spawnEnemy('right_spike', currentSpeed);
        }
        spikeSpawnRate = Math.max(40, spikeSpawnRate - Math.floor(elapsedTime / 15));
    }
    
    // YENİ: Yukarıdan gelen düşmanlar kaldırıldığı için bu kısım silindi
    // if (elapsedTime >= 30 && enemyTimer % topDownSpawnRate === 0) { ... }

    // 2. Soldan Gelen Düşmanlar (60 saniye sonra aktif)
    if (elapsedTime >= 60 && enemyTimer % leftRightSpawnRate === 0) {
        spawnEnemy('left_right', currentSpeed);
        leftRightSpawnRate = Math.max(150, leftRightSpawnRate - Math.floor((elapsedTime - 60) / 10));
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
        if ((enemy.speedX < 0 && enemy.x + enemy.width < 0) ||
            (enemy.speedX > 0 && enemy.x > canvas.width)    ||
            (enemy.speedY > 0 && enemy.y > canvas.height)) {
            remove = true;
        }

        if (remove) {
            enemies.splice(i, 1);
            i--;
        }
    }
}

// --- Çizim Fonksiyonları ---
function drawEnemy(enemy) {
    if (enemy.type === 'right_spike' && enemy.isGroundSpike) {
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y + enemy.height);
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y);
        ctx.closePath();
        ctx.fill();
    } else {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
