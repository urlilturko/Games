//board
let tileSize = 48;
let rows = 16;
let columns = 16;

let board;
let boardWidth = tileSize * columns;
let boardHeight = tileSize * rows;
let context;

//ship
let shipWidth = tileSize * 3;
let shipHeight = tileSize / 4;
let shipX = tileSize * columns / 2 - shipWidth / 2;
let shipY = tileSize * rows - tileSize * 2;

let ship = {
    x: shipX,
    y: shipY,
    width: shipWidth,
    height: shipHeight
};

let shipVelocityX = tileSize;

//ball
let ballSize = tileSize / 2;
let ballX = boardWidth / 2 - ballSize / 2;
let ballY = boardHeight / 2 - ballSize / 2;
let ballVelocityX = 4;
let ballVelocityY = -4;

let ball = {
    x: ballX,
    y: ballY,
    size: ballSize,
    velocityX: ballVelocityX,
    velocityY: ballVelocityY
};

// Static blocks
let blockArray = [];

let score = 0;
let gameOver = false;
let win = false;  // Flag to check if the player has won

// Timer for blocks' downward movement
let moveDownTimer = 0;

window.onload = function () {
    board = document.getElementById("board");
    board.width = boardWidth;
    board.height = boardHeight;
    context = board.getContext("2d");

    createBlocks();
    requestAnimationFrame(update);
    document.addEventListener("keydown", moveShip);

    setInterval(moveBlocksDown, 2000);  // Move blocks down every 2 seconds
};

function update() {
    requestAnimationFrame(update);

    if (gameOver) {
        context.fillStyle = "white";
        context.font = "30px courier";
        context.fillText("GAME OVER", board.width / 2 - 80, board.height / 2);
        return;
    }

    if (win) {
        context.fillStyle = "white";
        context.font = "30px courier";
        context.fillText("YOU WIN!", board.width / 2 - 80, board.height / 2);
        return;
    }

    context.clearRect(0, 0, board.width, board.height);
    context.fillStyle = "white";
    context.fillRect(ship.x, ship.y, ship.width, ship.height);

    // Update ball movement
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // Ball collision with walls
    if (ball.x <= 0 || ball.x + ball.size >= boardWidth) {
        ball.velocityX *= -1;
    }
    if (ball.y <= 0) {
        ball.velocityY *= -1;
    }

    // Ball collision with ship
    if (
        ball.x + ball.size > ship.x &&
        ball.x < ship.x + ship.width &&
        ball.y + ball.size > ship.y &&
        ball.y < ship.y + ship.height
    ) {
        ball.velocityY *= -1;
    }

    // Game over if ball goes below ship
    /*if (ball.y > boardHeight) {
        gameOver = true;
    }*/

    context.fillStyle = "red";
    context.beginPath();
    context.arc(ball.x + ball.size / 2, ball.y + ball.size / 2, ball.size / 2, 0, Math.PI * 2);
    context.fill();

    // Draw static blocks
    for (let i = 0; i < blockArray.length; i++) {
        let block = blockArray[i];
        context.fillStyle = "blue";
        context.beginPath();
        // Drawing corners
        context.moveTo(block.x, block.y);
        context.lineTo(block.x + block.width - 5, block.y); // top right corner
        context.lineTo(block.x + block.width - 5, block.y + block.height - 5); // bottom right corner
        context.lineTo(block.x, block.y + block.height - 5); // bottom left corner
        context.closePath();
        context.fill();

        // Set white color for the block border
        context.strokeStyle = "white";
        context.lineWidth = 2;
        context.stroke();  // Apply the border

        // Draw block value in the center
        context.fillStyle = "white";
        context.font = "16px courier";
        let textWidth = context.measureText(block.value).width;
        let textHeight = 16;  // Font size
        let textX = block.x + (block.width - textWidth) / 2;
        let textY = block.y + (block.height + textHeight) / 2;
        context.fillText(block.value, textX, textY);

        // Ball collision with blocks
        if (
            ball.x + ball.size > block.x &&
            ball.x < block.x + block.width &&
            ball.y + ball.size > block.y &&
            ball.y < block.y + block.height
        ) {
            ball.velocityY *= -1;
            score += block.value / 2;
            block.value /= 3;  // Divide value by 3 instead of 2
            if (block.value < 3) {
                blockArray.splice(i, 1);
                i--;
            }
        }
    }

    context.fillStyle = "white";
    context.font = "16px courier";
    context.fillText(score, 5, 20);
}

function moveShip(e) {
    if (gameOver || win) return;

    if (e.code == "ArrowLeft" && ship.x - shipVelocityX >= 0) {
        ship.x -= shipVelocityX;
    } else if (e.code == "ArrowRight" && ship.x + shipVelocityX + ship.width <= board.width) {
        ship.x += shipVelocityX;
    }
}

function createBlocks() {
    let blockSize = tileSize * 2;
    for (let i = 0; i < 5; i++) {
        let blockX = Math.random() * (boardWidth - blockSize);
        let blockY = Math.random() * (boardHeight / 3);
        let blockValue = Math.pow(3, Math.floor(Math.random() * 5) + 1); // 3'ün 5. kuvvetine kadar rastgele sayı 3^5 (243)
        blockArray.push({ x: blockX, y: blockY, width: blockSize, height: blockSize, value: blockValue });
    }
}

function moveBlocksDown() {
    // blokları kutu boyutunun yarısı kadar aşağıya indir (tileSize / 2)
    for (let i = 0; i < blockArray.length; i++) {
        blockArray[i].y += tileSize / 2;

        // blok tahtayı geçtiği zaman oyun bitiyor
        if (blockArray[i].y + tileSize > boardHeight) {
            gameOver = true;
            break;
        }
    }

    // oyun kazanma fonksiyonu (blokların yok edilip edilmediğini kontrol ediyor)
    if (blockArray.length === 0) {
        win = true;
    }
}
