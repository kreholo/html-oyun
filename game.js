const canvas = document.getElementById('gameCanvas');
// Tuval boyutlarını ayarlıyoruz
canvas.width = 800;
canvas.height = 600;
const ctx = canvas.getContext('2d');

const player = {
    x: 100,
    y: 500,
    width: 30,
    height: 30,
    color: 'red',
    speed: 5,
    velocityY: 0,
    isJumping: false,
    gravity: 0.5,
};

// Ana zemin platformu
const platforms = [
    { x: 0, y: 550, width: 800, height: 50, color: '#333' }, 
];

// Düşmanları tutacak tek bir dizi
let enemies = [];

// Zaman ve Skor
let startTime = performance.now();
let elapsedTime = 0;
let gameOver = false;

// Düşman Hız ve Oluşum Ayarları
let baseSpeed = 4;
let speedIncreaseRate = 0.05; // Hız her saniye 0.05 artacak
let enemyTimer = 0;

// Düşman oluşum sıklıkları (Düşük değer daha sık oluşum demektir)
let spikeSpawnRate = 120; // Sağdan gelen düşmanlar
let topDownSpawnRate = 180; // Yukarıdan gelenler (30s sonra aktif)
let leftRightSpawnRate = 240; // Soldan gelenler (60s sonra aktif)

let rightPressed = false;
let leftPressed = false;

// --- Olay Dinleyicileri ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if ((e.key === ' ' || e.key === 'ArrowUp') && !player.isJumping && !gameOver) {
        player.isJumping = true;
        player.velocityY = -10; 
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
});

// --- Oyun Sıfırlama ---
function resetGame() {
    player.x = 100;
    player.y = 500;
    player.velocityY = 0;
    player.isJumping = false;
    enemies = [];
    startTime = performance.now(); // Zamanlayıcıyı sıfırla
    elapsedTime = 0;
    
    // Spawn oranlarını başlangıç değerlerine getir
    spikeSpawnRate = 120;
    topDownSpawnRate = 180;
    leftRightSpawnRate = 240;
    enemyTimer = 0;
    
    gameOver = false;
    gameLoop();
}

// --- Düşman Oluşturma Fonksiyonu ---
function spawnEnemy(type, currentSpeed) {
    const enemy = { type: type, x: 0, y: 0, width: 20, height: 20, color: '#000', speedX: 0, speedY: 0 };
    
    // Sağdan Gelen Düşmanlar (Spike - Yer veya Havada)
    if (type === 'right_spike') {
        enemy.x = canvas.width;
        enemy.width = 20;
        enemy.height = 40;
        enemy.color = '#900'; // Kırmızımsı spike rengi
        enemy.speedX = -currentSpeed;
        
        // %50 Yere sabit, %50 havada yüzen düşman
        if (Math.random() < 0.5) {
            enemy.y = platforms[0].y - enemy.height; // Yerde
            enemy.isGroundSpike = true; // Çizim için işaretle
        } else {
            // Havada yüzen düşman (Y ekseninde rastgele)
            const minY = 50;
            const maxY = platforms[0].y - enemy.height - 50;
            enemy.y = Math.random() * (maxY - minY) + minY;
            enemy.isGroundSpike = false;
        }
    } 
    
    // Yukarıdan Gelen Düşmanlar (30s sonrası)
    else if (type === 'top_down') {
        enemy.x = Math.random() * (canvas.width - enemy.width);
        enemy.y = -enemy.height; // Canvas dışından başla
        enemy.width = 30;
        enemy.height = 30;
        enemy.color = 'blue';
        enemy.speedY = currentSpeed * 0.75; 
    }

    // Soldan Gelen Düşmanlar (60s sonrası)
    else if (type === 'left_right') {
        enemy.x = -enemy.width; // Canvas dışından başla
        // Zeminden biraz yukarıda rastgele y pozisyonu
        const minY = 100;
        const maxY = platforms[0].y - enemy.height - 50;
        enemy.y = Math.random() * (maxY - minY) + minY;
        enemy.width = 40;
        enemy.height = 15;
        enemy.color = 'orange';
        enemy.speedX = currentSpeed * 0.5; 
    }
    
    enemies.push(enemy);
}

function update() {
    if (gameOver) return;

    // --- Skor ve Hız Güncelleme ---
    const now = performance.now();
    const newElapsedTime = Math.floor((now - startTime) / 1000);
    
    // Her saniye hız artsın
    const currentSpeed = baseSpeed + newElapsedTime * speedIncreaseRate;
    
    // Sadece skor değiştiyse güncelle
    if (newElapsedTime !== elapsedTime) {
        elapsedTime = newElapsedTime;
    }
    
    // --- Oyuncu Hareketi ---
    if (rightPressed) player.x += player.speed;
    if (leftPressed) player.x -= player.speed;

    // --- Yerçekimi ve Zemin Çarpışması ---
    player.velocityY += player.gravity;
    player.y += player.velocityY;

    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + platform.height &&
            player.velocityY >= 0 
        ) {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.isJumping = false;
        }
    });

    // --- Sınırları kontrol et ---
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    
    // --- Düşman Oluşturma ve Yönetimi ---
    enemyTimer++;
    
    // 1. Sağdan Gelen Düşmanlar (Her zaman aktif)
    if (enemyTimer % spikeSpawnRate === 0) {
        // Kümelenme (Clustering) Mantığı:
        let clusterSize = 1;
        const rand = Math.random();
        if (rand < 0.1) clusterSize = 3; // %10 ihtimalle 3 tane
        else if (rand < 0.3) clusterSize = 2; // %20 ihtimalle 2 tane
        
        for (let i = 0; i < clusterSize; i++) {
            spawnEnemy('right_spike', currentSpeed);
        }
        
        // Spawn oranını zorluğa göre ayarla (Minimum 40 frame)
        spikeSpawnRate = Math.max(40, spikeSpawnRate - Math.floor(elapsedTime / 15)); 
    }
    
    // 2. Yukarıdan Gelen Düşmanlar (30 saniye sonra aktif)
    if (elapsedTime >= 30) {
        if (enemyTimer % topDownSpawnRate === 0) {
            spawnEnemy('top_down', currentSpeed);
            topDownSpawnRate = Math.max(100, topDownSpawnRate - Math.floor((elapsedTime - 30) / 10));
        }
    }
    
    // 3. Soldan Gelen Düşmanlar (60 saniye sonra aktif)
    if (elapsedTime >= 60) {
        if (enemyTimer % leftRightSpawnRate === 0) {
            spawnEnemy('left_right', currentSpeed);
            leftRightSpawnRate = Math.max(150, leftRightSpawnRate - Math.floor((elapsedTime - 60) / 10));
        }
    }

    // Düşmanları hareket ettir ve çarpışma kontrolü yap
    for (let i = 0; i < enemies.length; i++) {
        let enemy = enemies[i];
        
        enemy.x += enemy.speedX;
        enemy.y += enemy.speedY;

        // --- Çarpışma Kontrolü (AABB) ---
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            gameOver = true;
            break; 
        }

        // Ekrandan çıkan düşmanları temizle
        let remove = false;
        if (enemy.type === 'right_spike' && enemy.x + enemy.width < 0) {
            remove = true; 
        } else if (enemy.type === 'top_down' && enemy.y > canvas.height) {
            remove = true; 
        } else if (enemy.type === 'left_right' && enemy.x > canvas.width) {
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
        // Yerdeki dikenleri üçgen olarak çiz (eski estetik)
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        // Tabanı yerde, ucu yukarıda
        ctx.moveTo(enemy.x, enemy.y + enemy.height); 
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y); 
        ctx.closePath();
        ctx.fill();
    } else {
        // Diğer tüm düşmanları (havadaki diken, yukarıdan ve soldan gelenler) blok olarak çiz
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
}


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Skoru (Zamanı) Çiz
    ctx.fillStyle = '#000';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Time: ' + elapsedTime + 's', 10, 30);

    // Platformları (Zemini) Çiz
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
    
    // Düşmanları Çiz
    enemies.forEach(drawEnemy);

    // Oyuncuyu Çiz
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Game Over Ekranı
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

gameLoop(); // Oyunu Başlat
