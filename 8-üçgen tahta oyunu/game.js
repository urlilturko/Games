class Game {
    constructor() {
        this.board = [];
        this.selectedPiece = null;
        this.validMoves = [];
        this.initializeBoard();
        this.setupEventListeners();
    }

    initializeBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';

        // 7x7 üçgen tahta oluştur
        for (let i = 0; i < 7; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            this.board[i] = [];

            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                // Özel noktaları ekle
                if ((i === 0 && j === 2) || (i === 0 && j === 3) || (i === 3 && j === 0) || (i === 4 && j === 6) || (i === 2 && j === 0) || (i === 6 && j === 4)) {
                    cell.classList.add('black');
                    this.board[i][j] = 1;
                }
                // Üçgen şeklini oluştur
                else if (i + j >= 3 && i + j <= 9) {
                    // Ortadaki boş nokta
                    if (i === 3 && j === 3) {
                        cell.classList.add('empty');
                        this.board[i][j] = 0;
                    }
                    // İlk satır için noktalar
                    else if (i === 0) {
                        if (j === 1 || j === 4) {
                            cell.classList.add('black');
                            this.board[i][j] = 1;
                        } else {
                            this.board[i][j] = -1;
                        }
                    }
                    // İkinci satır için noktalar
                    else if (i === 1) {
                        if (j >= 2 && j <= 4) {
                            cell.classList.add('black');
                            this.board[i][j] = 1;
                        } else {
                            this.board[i][j] = -1;
                        }
                    }
                    // Orta satırlar için noktalar
                    else if (i > 1 && i < 5) {
                        if (i === 3 && j === 3) {
                            cell.classList.add('empty');
                            this.board[i][j] = 0;
                        } else {
                            cell.classList.add('black');
                            this.board[i][j] = 1;
                        }
                    }
                    // Son iki satır için noktalar
                    else if (i >= 5) {
                        if (j >= 2 && j <= 4) {
                            cell.classList.add('black');
                            this.board[i][j] = 1;
                        } else {
                            this.board[i][j] = -1;
                        }
                    }
                    // Çapraz noktalar
                    else if ((i === 2 && j === 2) || (i === 4 && j === 4)) {
                        cell.classList.add('black');
                        this.board[i][j] = 1;
                    }
                    // En alttaki sağ kare
                    else if (i === 6 && j === 4) {
                        cell.classList.add('black');
                        this.board[i][j] = 1;
                    }
                    else {
                        this.board[i][j] = -1;
                    }
                } else {
                    this.board[i][j] = -1;
                }

                row.appendChild(cell);
            }
            gameBoard.appendChild(row);
        }
    }

    setupEventListeners() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell');
            if (!cell) return;

            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);

            if (this.board[row][col] === 1) {
                this.selectPiece(row, col);
            } else if (this.board[row][col] === 0 && this.selectedPiece) {
                this.movePiece(row, col);
            }
        });

        document.getElementById('resetButton').addEventListener('click', () => {
            this.initializeBoard();
            this.selectedPiece = null;
            this.validMoves = [];
        });
    }

    selectPiece(row, col) {
        // Önceki seçimi temizle
        if (this.selectedPiece) {
            const prevCell = document.querySelector(`[data-row="${this.selectedPiece.row}"][data-col="${this.selectedPiece.col}"]`);
            prevCell.classList.remove('selected');
        }

        // Yeni seçimi işaretle
        this.selectedPiece = { row, col };
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('selected');

        // Geçerli hamleleri hesapla
        this.calculateValidMoves(row, col);
    }

    calculateValidMoves(row, col) {
        // Geçerli hamleleri temizle
        this.validMoves.forEach(move => {
            const cell = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            cell.classList.remove('valid-move');
        });
        this.validMoves = [];

        // Olası hamleleri kontrol et
        const directions = [
            { dr: -2, dc: 0 }, // Yukarı
            { dr: 2, dc: 0 },  // Aşağı
            { dr: 0, dc: -2 }, // Sol
            { dr: 0, dc: 2 },  // Sağ
            { dr: -2, dc: 2 }, // Çapraz yukarı sağ
            { dr: 2, dc: -2 }  // Çapraz aşağı sol
        ];

        directions.forEach(dir => {
            const newRow = row + dir.dr;
            const newCol = col + dir.dc;
            const midRow = row + dir.dr / 2;
            const midCol = col + dir.dc / 2;

            if (this.isValidMove(newRow, newCol, midRow, midCol)) {
                this.validMoves.push({ row: newRow, col: newCol });
                const cell = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
                cell.classList.add('valid-move');
            }
        });
    }

    isValidMove(newRow, newCol, midRow, midCol) {
        return (
            newRow >= 0 && newRow < 7 &&
            newCol >= 0 && newCol < 7 &&
            this.board[newRow][newCol] === 0 &&
            this.board[midRow][midCol] === 1 &&
            this.board[newRow][newCol] !== -1
        );
    }

    movePiece(newRow, newCol) {
        if (!this.selectedPiece) return;

        const isValidMove = this.validMoves.some(
            move => move.row === newRow && move.col === newCol
        );

        if (!isValidMove) return;

        // Taşı hareket ettir
        const oldRow = this.selectedPiece.row;
        const oldCol = this.selectedPiece.col;
        const midRow = (oldRow + newRow) / 2;
        const midCol = (oldCol + newCol) / 2;

        // Tahtayı güncelle
        this.board[newRow][newCol] = 1;
        this.board[oldRow][oldCol] = 0;
        this.board[midRow][midCol] = 0;

        // Görsel güncelleme
        const oldCell = document.querySelector(`[data-row="${oldRow}"][data-col="${oldCol}"]`);
        const newCell = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
        const midCell = document.querySelector(`[data-row="${midRow}"][data-col="${midCol}"]`);

        oldCell.classList.remove('black');
        oldCell.classList.add('empty');
        newCell.classList.remove('empty');
        newCell.classList.add('black');
        midCell.classList.remove('black');
        midCell.classList.add('empty');

        // Seçimi ve geçerli hamleleri temizle
        oldCell.classList.remove('selected');
        this.validMoves.forEach(move => {
            const cell = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            cell.classList.remove('valid-move');
        });

        this.selectedPiece = null;
        this.validMoves = [];

        // Oyunun bitip bitmediğini kontrol et
        this.checkGameOver();
    }

    checkGameOver() {
        // Tüm noktaları kontrol et
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (this.board[i][j] === 1) {
                    // Bu noktanın hareket edebilip edemediğini kontrol et
                    const directions = [
                        { dr: -2, dc: 0 }, // Yukarı
                        { dr: 2, dc: 0 },  // Aşağı
                        { dr: 0, dc: -2 }, // Sol
                        { dr: 0, dc: 2 },  // Sağ
                        { dr: -2, dc: 2 }, // Çapraz yukarı sağ
                        { dr: 2, dc: -2 }  // Çapraz aşağı sol
                    ];

                    for (const dir of directions) {
                        const newRow = i + dir.dr;
                        const newCol = j + dir.dc;
                        const midRow = i + dir.dr / 2;
                        const midCol = j + dir.dc / 2;

                        if (this.isValidMove(newRow, newCol, midRow, midCol)) {
                            return; // En az bir nokta hareket edebiliyor, oyun devam ediyor
                        }
                    }
                }
            }
        }

        // Hiçbir nokta hareket edemiyorsa oyun bitti
        alert('Oyun bitti! Hiçbir nokta hareket edemiyor.');
    }
}

// Oyunu başlat
const game = new Game(); 