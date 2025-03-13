const canvas = document.getElementById('game-container');
const ctx = canvas.getContext('2d');
const GRID_SIZE = 32;
const GRID_WIDTH = 25;
const GRID_HEIGHT = 25;

// Canvas boyutunu ayarla
canvas.width = GRID_WIDTH * GRID_SIZE;
canvas.height = GRID_HEIGHT * GRID_SIZE;

let score = 0;
let timeLeft = 180; // Süreyi 180 saniyeye çıkardım
let gameOver = false;
let gameLoop;
let wallDropTimer = 0;
let powerUpTimer = 0;
const WALL_DROP_INTERVAL = 5; // Her 5 saniyede bir duvar iner
const POWER_UP_INTERVAL = 15; // Her 15 saniyede bir güç bonusu
const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time');

// Oyun nesneleri
const EMPTY = 0;
const WALL = 1;
const PLAYER = 2;
const BOMB = 3;
const EXPLOSION = 4;
const UNBREAKABLE_WALL = 5;
const POWER_UP = 6;
const ENEMY = 7; // Yeni düşman tipi

// Oyuncu özellikleri
let playerPos = {
    x: 1,
    y: 1,
    maxBombs: 1,
    currentBombs: 0,
    hasPowerUp: false,
    powerUpTimeLeft: 0,
    missiles: 3 // Anti tank füzesi sayısı
};

// Bombalar listesi
let bombs = [];

// Düşmanlar listesi
let enemies = [];

// Oyun tahtası
let gameBoard = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(EMPTY));

// Patlama parçacıkları için sınıf
class ExplosionParticle {
    constructor(x, y, angle, speed) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.size = Math.random() * 4 + 2;
        this.life = 1.0; // 1'den 0'a doğru azalacak
        this.color = `hsl(${Math.random() * 60 + 30}, 100%, 50%)`; // Sarı-turuncu arası
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life -= 0.02;
        this.size *= 0.95;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Patlama parçacıkları listesi
let explosionParticles = [];

// Düşman sınıfı
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.moveTimer = 0;
        this.moveInterval = 1200; // Hareket hızını 800ms'den 1200ms'ye çıkardım
        this.stuckTimer = 0;
        this.maxStuckTime = 1000;
    }

    update() {
        this.moveTimer += 200;
        this.stuckTimer += 200;
        
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            
            // Rastgele yön seç
            const directions = [[0,1], [1,0], [0,-1], [-1,0]];
            const randomDir = directions[Math.floor(Math.random() * directions.length)];
            let newX = this.x + randomDir[0];
            let newY = this.y + randomDir[1];
            
            // Eğer yeni pozisyon boşsa hareket et
            if (newX >= 0 && newX < GRID_WIDTH && 
                newY >= 0 && newY < GRID_HEIGHT &&
                (gameBoard[newY][newX] === EMPTY || gameBoard[newY][newX] === EXPLOSION)) {
                // Eski pozisyonu temizle
                gameBoard[this.y][this.x] = EMPTY;
                
                // Yeni pozisyonu güncelle
                this.x = newX;
                this.y = newY;
                gameBoard[this.y][this.x] = ENEMY;
                
                // Eğer oyuncuya çarparsa oyun biter
                if (this.x === playerPos.x && this.y === playerPos.y) {
                    endGame("Düşmana temas ettiniz!");
                }
            } else {
                // Hareket edemiyorsa takılı kalma süresini artır
                this.stuckTimer += this.moveInterval;
            }
        }
    }
}

// Duvarları labirent şeklinde yerleştir
function initializeWalls() {
    // Önce tüm haritayı duvarlarla doldur
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            gameBoard[y][x] = WALL;
        }
    }

    // Labirent oluşturma fonksiyonu
    function carve(x, y) {
        gameBoard[y][x] = EMPTY;
        
        // Yönler: sağ, aşağı, sol, yukarı
        const directions = [[2,0], [0,2], [-2,0], [0,-2]];
        // Yönleri karıştır
        directions.sort(() => Math.random() - 0.5);
        
        for (let [dx, dy] of directions) {
            let newX = x + dx;
            let newY = y + dy;
            
            if (newX > 0 && newX < GRID_WIDTH - 1 && 
                newY > 0 && newY < GRID_HEIGHT - 1 && 
                gameBoard[newY][newX] === WALL) {
                // Duvarı kır
                gameBoard[y + dy/2][x + dx/2] = EMPTY;
                carve(newX, newY);
            }
        }
    }

    // Labirenti oluştur (başlangıç noktasından başla)
    carve(1, 1);

    // Oyuncu başlangıç pozisyonunu boş bırak
    gameBoard[1][1] = EMPTY;
    
    // Bazı duvarları rastgele kırılamaz duvar yap
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (gameBoard[y][x] === WALL && Math.random() < 0.2) {
                gameBoard[y][x] = UNBREAKABLE_WALL;
            }
        }
    }

    // Düşmanları rastgele yerleştir
    const numberOfEnemies = 10; // Düşman sayısını 5'ten 10'a çıkardım
    enemies = []; // Düşman listesini sıfırla
    let enemiesPlaced = 0;

    while (enemiesPlaced < numberOfEnemies) {
        const x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1; // Kenarlardan kaçın
        const y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
        
        // Sadece boş alanlara ve oyuncu başlangıç pozisyonuna yakın olmayan yerlere yerleştir
        if (gameBoard[y][x] === EMPTY && 
            (Math.abs(x - 1) > 3 || Math.abs(y - 1) > 3)) { // Güvenli mesafeyi 2'den 3'e çıkardım
            gameBoard[y][x] = ENEMY;
            enemies.push(new Enemy(x, y));
            enemiesPlaced++;
        }
    }
}

// Oyuncu hareketini güncelle
function updatePlayerMovement() {
    if (playerPos.isMoving) {
        // Hedef pozisyona doğru hareket et
        const moveSpeed = 0.3; // Hareket hızını artırdım
        const dx = playerPos.targetX - playerPos.currentX;
        const dy = playerPos.targetY - playerPos.currentY;
        
        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) { // Eşik değerini düşürdüm
            playerPos.currentX = playerPos.targetX;
            playerPos.currentY = playerPos.targetY;
            playerPos.isMoving = false;
        } else {
            playerPos.currentX += dx * moveSpeed;
            playerPos.currentY += dy * moveSpeed;
        }
    }
}

// Oyun tahtasını çiz
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Arka plan grid'i
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            ctx.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        }
    }

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = gameBoard[y][x];
            
            switch(cell) {
                case WALL:
                    // Duvar gölgesi
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.fillRect(x * GRID_SIZE + 2, y * GRID_SIZE + 2, GRID_SIZE, GRID_SIZE);
                    // Duvar
                    const wallGradient = ctx.createLinearGradient(
                        x * GRID_SIZE, y * GRID_SIZE,
                        x * GRID_SIZE + GRID_SIZE, y * GRID_SIZE + GRID_SIZE
                    );
                    wallGradient.addColorStop(0, '#95a5a6');
                    wallGradient.addColorStop(1, '#7f8c8d');
                    ctx.fillStyle = wallGradient;
                    ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

                    // Tuğla dokusu
                    const brickWidth = GRID_SIZE / 2;
                    const brickHeight = GRID_SIZE / 3;
                    const brickOffset = (y % 2) * (brickWidth / 2); // Her sırada tuğlaları kaydır

                    // Tuğla çizgileri
                    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                    ctx.lineWidth = 1;

                    // Yatay çizgiler
                    for (let i = 0; i <= 3; i++) {
                        ctx.beginPath();
                        ctx.moveTo(x * GRID_SIZE, y * GRID_SIZE + i * brickHeight);
                        ctx.lineTo(x * GRID_SIZE + GRID_SIZE, y * GRID_SIZE + i * brickHeight);
                        ctx.stroke();
                    }

                    // Dikey çizgiler
                    for (let i = 0; i <= 2; i++) {
                        ctx.beginPath();
                        ctx.moveTo(x * GRID_SIZE + i * brickWidth + brickOffset, y * GRID_SIZE);
                        ctx.lineTo(x * GRID_SIZE + i * brickWidth + brickOffset, y * GRID_SIZE + GRID_SIZE);
                        ctx.stroke();
                    }

                    // Tuğla detayları
                    for (let row = 0; row < 3; row++) {
                        for (let col = 0; col < 2; col++) {
                            const brickX = x * GRID_SIZE + col * brickWidth + brickOffset;
                            const brickY = y * GRID_SIZE + row * brickHeight;

                            // Tuğla gölgesi
                            ctx.fillStyle = 'rgba(0,0,0,0.1)';
                            ctx.fillRect(brickX + 2, brickY + 2, brickWidth - 4, brickHeight - 4);

                            // Tuğla parlaklığı
                            ctx.fillStyle = 'rgba(255,255,255,0.1)';
                            ctx.fillRect(brickX, brickY, brickWidth, 2);
                            ctx.fillRect(brickX, brickY, 2, brickHeight);
                        }
                    }
                    break;

                case BOMB:
                    // Bomba gölgesi
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath();
                    ctx.arc(x * GRID_SIZE + GRID_SIZE/2 + 2, y * GRID_SIZE + GRID_SIZE/2 + 2, GRID_SIZE/3, 0, Math.PI * 2);
                    ctx.fill();
                    // Bomba
                    const bombGradient = ctx.createRadialGradient(
                        x * GRID_SIZE + GRID_SIZE/2, y * GRID_SIZE + GRID_SIZE/2, 0,
                        x * GRID_SIZE + GRID_SIZE/2, y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/3
                    );
                    bombGradient.addColorStop(0, '#e74c3c');
                    bombGradient.addColorStop(1, '#c0392b');
                    ctx.fillStyle = bombGradient;
                    ctx.beginPath();
                    ctx.arc(x * GRID_SIZE + GRID_SIZE/2, y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/3, 0, Math.PI * 2);
                    ctx.fill();
                    // Bomba fitili
                    ctx.fillStyle = '#8b4513';
                    ctx.fillRect(x * GRID_SIZE + GRID_SIZE/2 - 2, y * GRID_SIZE + GRID_SIZE/4, 4, GRID_SIZE/4);
                    break;

                case EXPLOSION:
                    // Patlama efekti
                    const explosionGradient = ctx.createRadialGradient(
                        x * GRID_SIZE + GRID_SIZE/2, y * GRID_SIZE + GRID_SIZE/2, 0,
                        x * GRID_SIZE + GRID_SIZE/2, y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2
                    );
                    explosionGradient.addColorStop(0, '#f1c40f');
                    explosionGradient.addColorStop(0.5, '#e67e22');
                    explosionGradient.addColorStop(1, 'rgba(241, 196, 15, 0)');
                    ctx.fillStyle = explosionGradient;
                    ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                    break;

                case UNBREAKABLE_WALL:
                    // Kırılamaz duvar gölgesi
                    ctx.fillStyle = 'rgba(0,0,0,0.4)';
                    ctx.fillRect(x * GRID_SIZE + 2, y * GRID_SIZE + 2, GRID_SIZE, GRID_SIZE);
                    // Kırılamaz duvar
                    const unbreakableGradient = ctx.createLinearGradient(
                        x * GRID_SIZE, y * GRID_SIZE,
                        x * GRID_SIZE + GRID_SIZE, y * GRID_SIZE + GRID_SIZE
                    );
                    unbreakableGradient.addColorStop(0, '#34495e');
                    unbreakableGradient.addColorStop(1, '#2c3e50');
                    ctx.fillStyle = unbreakableGradient;
                    ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                    // Kırılamaz duvar detayları
                    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x * GRID_SIZE, y * GRID_SIZE);
                    ctx.lineTo(x * GRID_SIZE + GRID_SIZE, y * GRID_SIZE);
                    ctx.moveTo(x * GRID_SIZE, y * GRID_SIZE);
                    ctx.lineTo(x * GRID_SIZE, y * GRID_SIZE + GRID_SIZE);
                    ctx.stroke();
                    break;

                case POWER_UP:
                    // Güç bonusu gölgesi
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath();
                    ctx.arc(x * GRID_SIZE + GRID_SIZE/2 + 2, y * GRID_SIZE + GRID_SIZE/2 + 2, GRID_SIZE/3, 0, Math.PI * 2);
                    ctx.fill();
                    // Güç bonusu
                    const powerUpGradient = ctx.createRadialGradient(
                        x * GRID_SIZE + GRID_SIZE/2, y * GRID_SIZE + GRID_SIZE/2, 0,
                        x * GRID_SIZE + GRID_SIZE/2, y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/3
                    );
                    powerUpGradient.addColorStop(0, '#9b59b6');
                    powerUpGradient.addColorStop(1, '#8e44ad');
                    ctx.fillStyle = powerUpGradient;
                    ctx.beginPath();
                    ctx.arc(x * GRID_SIZE + GRID_SIZE/2, y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/3, 0, Math.PI * 2);
                    ctx.fill();
                    // Yıldız efekti
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                        const radius = GRID_SIZE/3;
                        const x1 = x * GRID_SIZE + GRID_SIZE/2;
                        const y1 = y * GRID_SIZE + GRID_SIZE/2;
                        const x2 = x1 + Math.cos(angle) * radius;
                        const y2 = y1 + Math.sin(angle) * radius;
                        if (i === 0) {
                            ctx.moveTo(x1, y1);
                        }
                        ctx.lineTo(x2, y2);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    break;

                case ENEMY:
                    // Düşman gölgesi
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath();
                    ctx.arc(x * GRID_SIZE + GRID_SIZE/2 + 2, y * GRID_SIZE + GRID_SIZE/2 + 2, GRID_SIZE/3, 0, Math.PI * 2);
                    ctx.fill();
                    // Düşman vücudu
                    const enemyGradient = ctx.createRadialGradient(
                        x * GRID_SIZE + GRID_SIZE/2, y * GRID_SIZE + GRID_SIZE/2, 0,
                        x * GRID_SIZE + GRID_SIZE/2, y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/3
                    );
                    enemyGradient.addColorStop(0, '#e74c3c');
                    enemyGradient.addColorStop(1, '#c0392b');
                    ctx.fillStyle = enemyGradient;
                    ctx.beginPath();
                    ctx.arc(x * GRID_SIZE + GRID_SIZE/2, y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/3, 0, Math.PI * 2);
                    ctx.fill();
                    // Düşman gözleri
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(x * GRID_SIZE + GRID_SIZE/3, y * GRID_SIZE + GRID_SIZE/3, GRID_SIZE/8, 0, Math.PI * 2);
                    ctx.arc(x * GRID_SIZE + 2*GRID_SIZE/3, y * GRID_SIZE + GRID_SIZE/3, GRID_SIZE/8, 0, Math.PI * 2);
                    ctx.fill();
                    // Düşman göz bebekleri
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(x * GRID_SIZE + GRID_SIZE/3, y * GRID_SIZE + GRID_SIZE/3, GRID_SIZE/16, 0, Math.PI * 2);
                    ctx.arc(x * GRID_SIZE + 2*GRID_SIZE/3, y * GRID_SIZE + GRID_SIZE/3, GRID_SIZE/16, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }
    }

    if (!gameOver) {
        // Oyuncu gölgesi
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(
            playerPos.x * GRID_SIZE + 2, 
            playerPos.y * GRID_SIZE + 2, 
            GRID_SIZE, 
            GRID_SIZE
        );
        
        // Oyuncu vücudu
        const playerGradient = ctx.createLinearGradient(
            playerPos.x * GRID_SIZE, playerPos.y * GRID_SIZE,
            playerPos.x * GRID_SIZE + GRID_SIZE, playerPos.y * GRID_SIZE + GRID_SIZE
        );
        if (playerPos.hasPowerUp) {
            playerGradient.addColorStop(0, '#e67e22');
            playerGradient.addColorStop(1, '#d35400');
        } else {
            playerGradient.addColorStop(0, '#2ecc71');
            playerGradient.addColorStop(1, '#27ae60');
        }
        ctx.fillStyle = playerGradient;
        ctx.fillRect(
            playerPos.x * GRID_SIZE, 
            playerPos.y * GRID_SIZE, 
            GRID_SIZE, 
            GRID_SIZE
        );

        // Oyuncu detayları
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playerPos.x * GRID_SIZE, playerPos.y * GRID_SIZE);
        ctx.lineTo(playerPos.x * GRID_SIZE + GRID_SIZE, playerPos.y * GRID_SIZE);
        ctx.moveTo(playerPos.x * GRID_SIZE, playerPos.y * GRID_SIZE);
        ctx.lineTo(playerPos.x * GRID_SIZE, playerPos.y * GRID_SIZE + GRID_SIZE);
        ctx.stroke();

        // Oyuncu yüzü
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Gözler
        ctx.arc(playerPos.x * GRID_SIZE + GRID_SIZE/3, playerPos.y * GRID_SIZE + GRID_SIZE/3, GRID_SIZE/8, 0, Math.PI * 2);
        ctx.arc(playerPos.x * GRID_SIZE + 2*GRID_SIZE/3, playerPos.y * GRID_SIZE + GRID_SIZE/3, GRID_SIZE/8, 0, Math.PI * 2);
        ctx.fill();
        
        // Göz bebekleri
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(playerPos.x * GRID_SIZE + GRID_SIZE/3, playerPos.y * GRID_SIZE + GRID_SIZE/3, GRID_SIZE/16, 0, Math.PI * 2);
        ctx.arc(playerPos.x * GRID_SIZE + 2*GRID_SIZE/3, playerPos.y * GRID_SIZE + GRID_SIZE/3, GRID_SIZE/16, 0, Math.PI * 2);
        ctx.fill();

        // Gülümseme
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
            playerPos.x * GRID_SIZE + GRID_SIZE/2,
            playerPos.y * GRID_SIZE + GRID_SIZE/2,
            GRID_SIZE/4,
            0,
            Math.PI
        );
        ctx.stroke();

        // Kollar
        ctx.strokeStyle = playerPos.hasPowerUp ? '#d35400' : '#27ae60';
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Sol kol
        ctx.moveTo(playerPos.x * GRID_SIZE + GRID_SIZE/4, playerPos.y * GRID_SIZE + GRID_SIZE/2);
        ctx.lineTo(playerPos.x * GRID_SIZE, playerPos.y * GRID_SIZE + GRID_SIZE/2);
        // Sağ kol
        ctx.moveTo(playerPos.x * GRID_SIZE + 3*GRID_SIZE/4, playerPos.y * GRID_SIZE + GRID_SIZE/2);
        ctx.lineTo(playerPos.x * GRID_SIZE + GRID_SIZE, playerPos.y * GRID_SIZE + GRID_SIZE/2);
        ctx.stroke();

        // Bacaklar
        ctx.beginPath();
        // Sol bacak
        ctx.moveTo(playerPos.x * GRID_SIZE + GRID_SIZE/3, playerPos.y * GRID_SIZE + GRID_SIZE);
        ctx.lineTo(playerPos.x * GRID_SIZE + GRID_SIZE/3, playerPos.y * GRID_SIZE + GRID_SIZE + GRID_SIZE/4);
        // Sağ bacak
        ctx.moveTo(playerPos.x * GRID_SIZE + 2*GRID_SIZE/3, playerPos.y * GRID_SIZE + GRID_SIZE);
        ctx.lineTo(playerPos.x * GRID_SIZE + 2*GRID_SIZE/3, playerPos.y * GRID_SIZE + GRID_SIZE + GRID_SIZE/4);
        ctx.stroke();
        
        // Güç bonusu süresini göster
        if (playerPos.hasPowerUp) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                playerPos.powerUpTimeLeft, 
                playerPos.x * GRID_SIZE + GRID_SIZE/2, 
                playerPos.y * GRID_SIZE + GRID_SIZE/2
            );
        }

        // Füze sayısını göster
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Füzeler: ${playerPos.missiles}`, 10, 10);
    }
}

// Kırılamaz duvarları yukarıdan indir
function dropUnbreakableWalls() {
    wallDropTimer++;
    
    if (wallDropTimer >= WALL_DROP_INTERVAL) {
        wallDropTimer = 0;
        
        // Rastgele genişlikte duvar oluştur (3-8 birim arası)
        const wallWidth = Math.floor(Math.random() * 6) + 3;
        const startX = Math.floor(Math.random() * (GRID_WIDTH - wallWidth));
        
        // Duvarı en üstte oluştur
        for (let x = startX; x < startX + wallWidth; x++) {
            if (gameBoard[0][x] === EMPTY) {
                gameBoard[0][x] = UNBREAKABLE_WALL;
            }
        }
    }
}

// Duvarları aşağı kaydır
function moveWallsDown() {
    for (let y = GRID_HEIGHT - 1; y > 0; y--) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (gameBoard[y][x] === EMPTY && gameBoard[y-1][x] === UNBREAKABLE_WALL) {
                gameBoard[y][x] = UNBREAKABLE_WALL;
                gameBoard[y-1][x] = EMPTY;
                
                // Eğer duvar oyuncunun üzerine düşerse oyun biter
                if (y === playerPos.y && x === playerPos.x) {
                    endGame("Duvar üzerinize düştü!");
                }
            }
        }
    }
}

// Bomba patlama efekti
function explodeBomb(bomb) {
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    
    // Oyuncu bombanın üzerindeyse ölür
    if (playerPos.x === bomb.x && playerPos.y === bomb.y) {
        endGame("Bomba sizi öldürdü!");
        return;
    }

    // Patlama parçacıklarını oluştur
    const centerX = bomb.x * GRID_SIZE + GRID_SIZE/2;
    const centerY = bomb.y * GRID_SIZE + GRID_SIZE/2;
    
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = Math.random() * 3 + 2;
        explosionParticles.push(new ExplosionParticle(centerX, centerY, angle, speed));
    }
    
    for (let [dx, dy] of directions) {
        let newX = bomb.x + dx;
        let newY = bomb.y + dy;
        
        if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT) {
            if (gameBoard[newY][newX] === WALL) {
                gameBoard[newY][newX] = EMPTY;
                score += 10;
                scoreElement.textContent = score;
                
                // Duvar kırılma parçacıkları
                const wallX = newX * GRID_SIZE + GRID_SIZE/2;
                const wallY = newY * GRID_SIZE + GRID_SIZE/2;
                for (let i = 0; i < 8; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 2 + 1;
                    explosionParticles.push(new ExplosionParticle(wallX, wallY, angle, speed));
                }
            }
            // Düşmanı öldür
            if (gameBoard[newY][newX] === ENEMY) {
                gameBoard[newY][newX] = EMPTY;
                score += 100; // Düşman öldürme bonusu
                scoreElement.textContent = score;
                
                // Düşman öldürme parçacıkları
                const enemyX = newX * GRID_SIZE + GRID_SIZE/2;
                const enemyY = newY * GRID_SIZE + GRID_SIZE/2;
                for (let i = 0; i < 12; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 3 + 2;
                    explosionParticles.push(new ExplosionParticle(enemyX, enemyY, angle, speed));
                }
                
                // Düşmanı listeden kaldır
                enemies = enemies.filter(enemy => enemy.x !== newX || enemy.y !== newY);
                
                // Tüm düşmanlar öldüyse oyunu kazan
                if (enemies.length === 0) {
                    endGame("Tebrikler! Tüm düşmanları yendiniz!", true);
                    return;
                }
            }
            // Kırılamaz duvarları patlatma
            if (gameBoard[newY][newX] !== UNBREAKABLE_WALL) {
                gameBoard[newY][newX] = EXPLOSION;
            }
            
            // Patlama oyuncuya değerse ölür
            if (newX === playerPos.x && newY === playerPos.y) {
                endGame("Bomba sizi öldürdü!");
                return;
            }
        }
    }
    
    gameBoard[bomb.y][bomb.x] = EXPLOSION;

    // Patlama animasyonu
    let animationFrame = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Parçacıkları güncelle ve çiz
        explosionParticles = explosionParticles.filter(particle => {
            particle.update();
            particle.draw(ctx);
            return particle.life > 0;
        });

        // Oyun tahtasını çiz
        drawBoard();
        
        animationFrame++;
        if (animationFrame < 30) { // 30 kare boyunca animasyonu devam ettir
            requestAnimationFrame(animate);
        } else {
            // Patlamayı temizle
            for (let [dx, dy] of directions) {
                let newX = bomb.x + dx;
                let newY = bomb.y + dy;
                
                if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT) {
                    if (gameBoard[newY][newX] === EXPLOSION) {
                        gameBoard[newY][newX] = EMPTY;
                    }
                }
            }
            if (gameBoard[bomb.y][bomb.x] === EXPLOSION) {
                gameBoard[bomb.y][bomb.x] = EMPTY;
            }
            drawBoard();
        }
    }

    animate();
}

// Mermi sınıfı
class Missile {
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = 0.3;
        this.angle = Math.atan2(targetY - startY, targetX - startX);
        this.trail = []; // Mermi izi
        this.maxTrailLength = 5;
    }

    update() {
        // Mermi izini güncelle
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Hedefe doğru hareket et
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Hedefe ulaştı mı kontrol et
        const distance = Math.sqrt(
            Math.pow(this.targetX - this.x, 2) + 
            Math.pow(this.targetY - this.y, 2)
        );
        return distance < 0.1;
    }

    draw(ctx) {
        // Mermi izini çiz
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.trail.length - 1; i++) {
            const p1 = this.trail[i];
            const p2 = this.trail[i + 1];
            ctx.moveTo(p1.x * GRID_SIZE + GRID_SIZE/2, p1.y * GRID_SIZE + GRID_SIZE/2);
            ctx.lineTo(p2.x * GRID_SIZE + GRID_SIZE/2, p2.y * GRID_SIZE + GRID_SIZE/2);
        }
        ctx.stroke();

        // Mermiyi çiz
        const missileX = this.x * GRID_SIZE + GRID_SIZE/2;
        const missileY = this.y * GRID_SIZE + GRID_SIZE/2;
        
        // Mermi gölgesi
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(missileX + 2, missileY + 2, GRID_SIZE/6, 0, Math.PI * 2);
        ctx.fill();

        // Mermi gövdesi
        const missileGradient = ctx.createRadialGradient(
            missileX, missileY, 0,
            missileX, missileY, GRID_SIZE/6
        );
        missileGradient.addColorStop(0, '#ff4500');
        missileGradient.addColorStop(1, '#ff0000');
        ctx.fillStyle = missileGradient;
        ctx.beginPath();
        ctx.arc(missileX, missileY, GRID_SIZE/6, 0, Math.PI * 2);
        ctx.fill();

        // Mermi alevi
        const flameGradient = ctx.createRadialGradient(
            missileX - Math.cos(this.angle) * GRID_SIZE/4,
            missileY - Math.sin(this.angle) * GRID_SIZE/4,
            0,
            missileX - Math.cos(this.angle) * GRID_SIZE/4,
            missileY - Math.sin(this.angle) * GRID_SIZE/4,
            GRID_SIZE/3
        );
        flameGradient.addColorStop(0, 'rgba(255, 165, 0, 0.8)');
        flameGradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(
            missileX - Math.cos(this.angle) * GRID_SIZE/4,
            missileY - Math.sin(this.angle) * GRID_SIZE/4,
            GRID_SIZE/3,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

// Aktif mermiler listesi
let activeMissiles = [];

// Anti tank füzesi atma fonksiyonu
function fireMissile(startX, startY, targetX, targetY) {
    if (playerPos.missiles > 0) {
        playerPos.missiles--;
        activeMissiles.push(new Missile(startX, startY, targetX, targetY));
    }
}

// Mermi animasyonu
function animateMissiles() {
    activeMissiles = activeMissiles.filter(missile => {
        const reachedTarget = missile.update();
        if (reachedTarget) {
            explodeMissile(Math.round(missile.x), Math.round(missile.y));
            return false;
        }
        missile.draw(ctx);
        return true;
    });
}

function endGame(message, isWin = false) {
    gameOver = true;
    clearInterval(gameLoop);
    
    // Kazanma durumunda ekstra puan ver
    if (isWin) {
        const timeBonus = Math.floor(timeLeft * 10); // Kalan süreye göre bonus
        score += timeBonus;
        message += `\nZaman Bonusu: ${timeBonus}`;
    }
    
    alert(`${message}\nPuanınız: ${score}`);
}

function updateTime() {
    timeLeft--;
    timeElement.textContent = timeLeft;
    
    if (timeLeft <= 0) {
        endGame("Süre bitti!");
    }
}

// Klavye kontrollerini dinle
document.addEventListener('keydown', (e) => {
    if (gameOver) return;

    let newX = playerPos.x;
    let newY = playerPos.y;

    switch(e.key) {
        case 'w':
        case 'W':
            newY--;
            break;
        case 's':
        case 'S':
            newY++;
            break;
        case 'a':
        case 'A':
            newX--;
            break;
        case 'd':
        case 'D':
            newX++;
            break;
        case 'f':
        case 'F':
            if (gameBoard[playerPos.y][playerPos.x] !== BOMB && 
                playerPos.currentBombs < playerPos.maxBombs) {
                gameBoard[playerPos.y][playerPos.x] = BOMB;
                const bomb = { x: playerPos.x, y: playerPos.y };
                bombs.push(bomb);
                playerPos.currentBombs++;
                setTimeout(() => {
                    explodeBomb(bomb);
                    bombs = bombs.filter(b => b !== bomb);
                    playerPos.currentBombs--;
                }, 2000);
            }
            break;
        case 'g':
        case 'G':
            // En yakın düşmanı hedef al
            let nearestEnemy = null;
            let minDistance = Infinity;
            
            enemies.forEach(enemy => {
                const distance = Math.sqrt(
                    Math.pow(enemy.x - playerPos.x, 2) + 
                    Math.pow(enemy.y - playerPos.y, 2)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemy = enemy;
                }
            });
            
            if (nearestEnemy) {
                fireMissile(playerPos.x, playerPos.y, nearestEnemy.x, nearestEnemy.y);
            }
            break;
    }

    // Yeni pozisyon geçerli ve boş ise hareket et
    if (newX >= 0 && newX < GRID_WIDTH && 
        newY >= 0 && newY < GRID_HEIGHT && 
        (gameBoard[newY][newX] === EMPTY || 
         gameBoard[newY][newX] === EXPLOSION || 
         gameBoard[newY][newX] === POWER_UP)) {
        
        // Güç bonusu alındıysa
        if (gameBoard[newY][newX] === POWER_UP) {
            applyPowerUp();
            score += 50; // Bonus puan
            scoreElement.textContent = score;
        }
        
        playerPos.x = newX;
        playerPos.y = newY;
        gameBoard[newY][newX] = EMPTY;
    } else if (gameBoard[newY][newX] === ENEMY) {
        // Düşmana temas edildiğinde oyun biter
        endGame("Düşmana temas ettiniz!");
    }

    drawBoard();
});

// Güç bonusu fonksiyonları
function createPowerUp() {
    powerUpTimer++;
    
    if (powerUpTimer >= POWER_UP_INTERVAL) {
        powerUpTimer = 0;
        
        // Rastgele bir boş alana güç bonusu yerleştir
        let placed = false;
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!placed && attempts < maxAttempts) {
            const x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
            const y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
            
            if (gameBoard[y][x] === EMPTY) {
                gameBoard[y][x] = POWER_UP;
                placed = true;
            }
            attempts++;
        }
    }
}

function applyPowerUp() {
    playerPos.hasPowerUp = true;
    playerPos.powerUpTimeLeft = 10; // 10 saniyelik güç bonusu
    playerPos.maxBombs = 2; // Maksimum bomba sayısını artır
}

function updatePowerUpTimer() {
    if (playerPos.hasPowerUp) {
        playerPos.powerUpTimeLeft--;
        if (playerPos.powerUpTimeLeft <= 0) {
            playerPos.hasPowerUp = false;
            playerPos.maxBombs = 1; // Normal bomba sayısına dön
        }
    }
}

// Oyunu başlat
initializeWalls();
drawBoard();

// Oyun döngüsü
let lastTimeUpdate = 0;
gameLoop = setInterval(() => {
    const currentTime = Date.now();
    
    // Her saniyede bir zamanı güncelle
    if (currentTime - lastTimeUpdate >= 1000) {
        updateTime();
        lastTimeUpdate = currentTime;
    }
    
    dropUnbreakableWalls();
    moveWallsDown();
    createPowerUp();
    updatePowerUpTimer();
    
    // Düşmanları güncelle
    enemies.forEach(enemy => enemy.update());
    animateMissiles(); // Mermi animasyonunu ekle
    
    drawBoard();
}, 300); 