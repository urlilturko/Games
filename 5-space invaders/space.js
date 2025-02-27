//board
let tileSize = 32;
let rows = 16;
let columns = 16;

let board;
let boardWidth = tileSize * columns;
let boardHeight = tileSize * rows;
let context;

//ship
let shipWidth = tileSize * 2;
let shipHeight = tileSize;
let shipX = tileSize * columns / 2 - tileSize;
let shipY = tileSize * rows - tileSize * 2;

let ship = {
    x: shipX,
    y: shipY,
    width: shipWidth,
    height: shipHeight
};

let shipImg;
let shipVelocityX = tileSize;

//aliens
let alienArray = [];
let alienWidth = tileSize * 2;
let alienHeight = tileSize;
let alienX = tileSize;
let alienY = tileSize;
let alienImg;

let alienRows = 2;
let alienColumns = 3;
let alienCount = 0;
let alienVelocityX = 1;

//bullets
let bulletArray = [];
let bulletVelocityY = -10;

//bombs
let bombArray = [];
let bombVelocityY = 3;

let score = 0;
let gameOver = false;

window.onload = function () {
    board = document.getElementById("board");
    board.width = boardWidth;
    board.height = boardHeight;
    context = board.getContext("2d");

    shipImg = new Image();
    shipImg.src = "./ship.png";
    shipImg.onload = function () {
        context.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);
    };

    alienImg = new Image();
    alienImg.src = "./alien.png";
    createAliens();

    requestAnimationFrame(update);
    document.addEventListener("keydown", moveShip);
    document.addEventListener("keyup", shoot);

    setInterval(dropBomb, 10000);
};

function update() {
    requestAnimationFrame(update);

    if (gameOver) {
        context.fillStyle = "white";
        context.font = "30px courier";
        context.fillText("GAME OVER", board.width / 2 - 80, board.height / 2);
        return;
    }

    context.clearRect(0, 0, board.width, board.height);
    context.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);

    for (let i = 0; i < alienArray.length; i++) {
        let alien = alienArray[i];
        if (alien.alive) {
            alien.x += alienVelocityX;

            if (alien.x + alien.width >= board.width || alien.x <= 0) {
                alienVelocityX *= -1;
                alien.x += alienVelocityX * 2;
                for (let j = 0; j < alienArray.length; j++) {
                    alienArray[j].y += alienHeight;
                }
            }
            context.drawImage(alienImg, alien.x, alien.y, alien.width, alien.height);

            if (alien.y >= ship.y) {
                gameOver = true;
            }
        }
    }

    for (let i = 0; i < bulletArray.length; i++) {
        let bullet = bulletArray[i];
        bullet.y += bulletVelocityY;
        context.fillStyle = "white";
        context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

        for (let j = 0; j < alienArray.length; j++) {
            let alien = alienArray[j];
            if (!bullet.used && alien.alive && detectCollision(bullet, alien)) {
                bullet.used = true;
                alien.alive = false;
                alienCount--;
                score += 100;
            }
        }
    }

    while (bulletArray.length > 0 && (bulletArray[0].used || bulletArray[0].y < 0)) {
        bulletArray.shift();
    }

    updateBombs();

    if (alienCount == 0) {
        score += alienColumns * alienRows * 100;
        alienColumns = Math.min(alienColumns + 1, columns / 2 - 2);
        alienRows = Math.min(alienRows + 1, rows - 4);
        alienVelocityX += (alienVelocityX > 0) ? 0.2 : -0.2;
        alienArray = [];
        bulletArray = [];
        bombArray = [];
        createAliens();
    }

    context.fillStyle = "white";
    context.font = "16px courier";
    context.fillText(score, 5, 20);
}

function moveShip(e) {
    if (gameOver) return;

    if (e.code == "ArrowLeft" && ship.x - shipVelocityX >= 0) {
        ship.x -= shipVelocityX;
    } else if (e.code == "ArrowRight" && ship.x + shipVelocityX + ship.width <= board.width) {
        ship.x += shipVelocityX;
    }
}

function createAliens() {
    for (let c = 0; c < alienColumns; c++) {
        for (let r = 0; r < alienRows; r++) {
            let alien = { img: alienImg, x: alienX + c * alienWidth, y: alienY + r * alienHeight, width: alienWidth, height: alienHeight, alive: true };
            alienArray.push(alien);
        }
    }
    alienCount = alienArray.length;
}

function shoot(e) {
    if (gameOver) return;
    if (e.code == "Space") {
        let bullet = { x: ship.x + shipWidth * 15 / 32, y: ship.y, width: tileSize / 8, height: tileSize / 2, used: false };
        bulletArray.push(bullet);
    }
}

function dropBomb() {
    if (gameOver || alienArray.length === 0) return;
    let aliveAliens = alienArray.filter(alien => alien.alive);
    if (aliveAliens.length === 0) return;
    let randomAlien = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
    let bomb = { x: randomAlien.x + alienWidth / 2 - tileSize / 8, y: randomAlien.y + alienHeight, width: tileSize / 6, height: tileSize / 2, used: false };
    bombArray.push(bomb);
}

function updateBombs() {
    for (let bomb of bombArray) {
        bomb.y += bombVelocityY;
        context.fillStyle = "red";
        context.fillRect(bomb.x, bomb.y, bomb.width, bomb.height);
        if (!bomb.used && detectCollision(bomb, ship)) {
            gameOver = true;
            bomb.used = true;
        }
    }
    bombArray = bombArray.filter(bomb => !bomb.used && bomb.y <= board.height);
}

function detectCollision(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
