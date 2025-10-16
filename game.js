const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const player = {
    x: 50,
    y: 500,
    width: 30,
    height: 30,
    color: 'red',
    speed: 5,
    velocityY: 0,
    isJumping: false,
    gravity: 0.5,
};

const platforms = [
    { x: 0, y: 550, width: 800, height: 50, color: 'green' },
    { x: 200, y: 450, width: 150, height: 20, color: 'green' },
    { x: 500, y: 350, width: 150, height: 20, color: 'green' },
];

let rightPressed = false;
let leftPressed = false;

document.addEventListener('keydown', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if (e.key === ' ' && !player.isJumping) {
        player.isJumping = true;
        player.velocityY = -10;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
});

function update() {
    // Oyuncu hareketini kontrol et
    if (rightPressed) {
        player.x += player.speed;
    }
    if (leftPressed) {
        player.x -= player.speed;
    }

    // Yerçekimi
    if (player.isJumping || player.y + player.height < canvas.height) {
        player.velocityY += player.gravity;
        player.y += player.velocityY;
    }

    // Çarpışma algılama
    let onPlatform = false;
    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + platform.height &&
            player.velocityY >= 0 // Sadece aşağı düşerken kontrol et
        ) {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.isJumping = false;
            onPlatform = true;
        }
    });

    if (player.y + player.height >= canvas.height && !onPlatform) {
        player.y = canvas.height - player.height;
        player.velocityY = 0;
        player.isJumping = false;
    }

    // Sınırları kontrol et
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
}

function draw() {
    // Oyun alanını temizle
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Platformları çiz
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Oyuncuyu çiz
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();