const canvas = document.getElementById('gameCanvas');
// Assuming canvas is set up with a width and height, e.g., 800x600
canvas.width = 800;
canvas.height = 600;
const ctx = canvas.getContext('2d');

const player = {
    x: 100, // Move player to the left
    y: 500,
    width: 30,
    height: 30,
    color: 'red',
    speed: 5,
    velocityY: 0,
    isJumping: false,
    gravity: 0.5,
};

// Only keep the main ground platform
const platforms = [
    { x: 0, y: 550, width: 800, height: 50, color: '#333' }, // Darker ground
];

// New array to hold the incoming spikes (enemies)
let spikes = [];
// Enemy spawn control
let spikeSpawnRate = 120; // Lower number means faster spawn (every 120 frames)
let spikeTimer = 0;
const spikeSpeed = 4;
let score = 0;
let gameOver = false;

let rightPressed = false;
let leftPressed = false;

document.addEventListener('keydown', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if ((e.key === ' ' || e.key === 'ArrowUp') && !player.isJumping && !gameOver) {
        player.isJumping = true;
        player.velocityY = -10; // Jump strength
    } else if (e.key === 'r' && gameOver) {
        // Restart game on 'R' key press
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

// Function to reset the game state
function resetGame() {
    player.x = 100;
    player.y = 500;
    player.velocityY = 0;
    player.isJumping = false;
    spikes = [];
    score = 0;
    spikeTimer = 0;
    gameOver = false;
    gameLoop(); // Restart the loop
}

// Function to generate a new spike
function spawnSpike() {
    const spikeHeight = 40;
    const spikeWidth = 20;
    // Spikes will appear from the right edge, on the ground platform
    const x = canvas.width;
    const y = platforms[0].y - spikeHeight; // Adjust to sit on the ground
    
    // Choose a random color for variety
    const colors = ['#000', '#555', '#900'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    spikes.push({
        x: x,
        y: y,
        width: spikeWidth,
        height: spikeHeight,
        color: color,
        speed: spikeSpeed,
    });
}

function update() {
    if (gameOver) return;

    // --- Player Movement ---
    if (rightPressed) {
        player.x += player.speed;
    }
    if (leftPressed) {
        player.x -= player.speed;
    }

    // --- Gravity and Vertical Movement ---
    // Apply gravity if player is jumping or not on a platform
    let onPlatform = false;
    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height === platform.y
        ) {
            onPlatform = true;
        }
    });

    if (!onPlatform || player.isJumping) {
        player.velocityY += player.gravity;
        player.y += player.velocityY;
    } else if (onPlatform) {
        // If on a platform, stop vertical movement and jumping state
        player.velocityY = 0;
        player.isJumping = false;
    }
    
    // Check collision with platforms (for landing)
    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + platform.height &&
            player.velocityY >= 0 // Only check when falling
        ) {
            player.y = platform.y - player.height; // Snap to the top of the platform
            player.velocityY = 0;
            player.isJumping = false;
        }
    });

    // --- Boundary Check ---
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // --- Spike Management ---
    // Increase timer and spawn a spike when the timer reaches the rate
    spikeTimer++;
    if (spikeTimer >= spikeSpawnRate) {
        spawnSpike();
        spikeTimer = 0;
        // Optionally, make the game harder by decreasing the spawn rate (making it faster)
        // spikeSpawnRate = Math.max(60, spikeSpawnRate - 1); 
    }

    // Move spikes and check for collision
    for (let i = 0; i < spikes.length; i++) {
        let spike = spikes[i];
        spike.x -= spike.speed;

        // Collision Check: Player hits a spike
        if (
            player.x < spike.x + spike.width &&
            player.x + player.width > spike.x &&
            player.y < spike.y + spike.height &&
            player.y + player.height > spike.y
        ) {
            // GAME OVER!
            gameOver = true;
            break; 
        }

        // Remove spikes that have moved off the left edge and increase score
        if (spike.x + spike.width < 0) {
            spikes.splice(i, 1);
            score++;
            i--; // Decrement index because we removed an element
        }
    }

    // Optionally increase difficulty and score rate over time
    if (score % 20 === 0 && score > 0) {
        spikeSpawnRate = Math.max(40, spikeSpawnRate - 1); // Make it spawn faster, minimum 40
        // spikeSpeed += 0.1; // Make spikes move faster
    }
}

function drawSpike(spike) {
    // A simple triangle to represent a spike
    ctx.fillStyle = spike.color;
    ctx.beginPath();
    // Base of the triangle (on the ground)
    ctx.moveTo(spike.x, spike.y + spike.height); 
    ctx.lineTo(spike.x + spike.width, spike.y + spike.height);
    // Tip of the triangle
    ctx.lineTo(spike.x + spike.width / 2, spike.y); 
    ctx.closePath();
    ctx.fill();
}


function draw() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Score
    ctx.fillStyle = '#000';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 10, 30);

    // Draw Platforms (Ground)
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
    
    // Draw Spikes
    spikes.forEach(drawSpike);

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw Game Over Screen
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.font = '24px Arial';
        ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 30);
        ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 70);
    }
}

function gameLoop() {
    update();
    draw();
    // Only continue the loop if the game is not over
    if (!gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

gameLoop(); // Start the game
