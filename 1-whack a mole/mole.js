let currMoleTile;
let currMoleTile1;
let currPlantTile;
let score = 0;
let gameOver = false;

window.onload = function () {
    setGame();
}

function setGame() {
    //set up the grid in html
    for (let i = 0; i < 9; i++) { //i goes from 0 to 8, stops at 9
        //<div id="0-8"></div>
        let tile = document.createElement("div");
        tile.id = i.toString();
        tile.addEventListener("click", selectTile);
        document.getElementById("board").appendChild(tile);
    }
    setInterval(setMole, 2000); // 1000 miliseconds = 1 second, every 1 second call setMole
    setInterval(setMole1, 1000); // 1000 miliseconds = 1 second, every 1 second call setMole
    setInterval(setPlant, 1000); // 2000 miliseconds = 2 seconds, every 2 second call setPlant
}

function getRandomTile() {
    //math.random --> 0-1 --> (0-1) * 9 = (0-9) --> round down to (0-8) integers
    let num = Math.floor(Math.random() * 9);
    return num.toString();
}

function speed(){
    if (score=100){
        setInterval(setMole, 1000);
        setInterval(setMole1, 500);
        setInterval(setPlant, 1000);
    }
}
function setMole() {
    if (gameOver) {
        return;
    }
    if (currMoleTile) {
        currMoleTile.innerHTML = "";
    }
    let mole = document.createElement("img");
    mole.src = "./M60T-Sabra.png";

    let num = getRandomTile();
    if (currPlantTile && currPlantTile.id == num) {
        return;
    }
    else if (currMoleTile1 && currMoleTile1.id == num) {
        return;
    }
    currMoleTile = document.getElementById(num);
    currMoleTile.appendChild(mole);
}
function setMole1() {
    if (gameOver) {
        return;
    }
    if (currMoleTile1) {
        currMoleTile1.innerHTML = "";
    }
    let mole = document.createElement("img");
    mole.src = "./leo2png.png";

    let num = getRandomTile();
    if (currPlantTile && currPlantTile.id == num) {
        return;
    }
    else if (currMoleTile && currMoleTile.id == num) {
        return;}
    currMoleTile1 = document.getElementById(num);
    currMoleTile1.appendChild(mole);
}

function setPlant() {
    if (gameOver) {
        return;
    }
    if (currPlantTile) {
        currPlantTile.innerHTML = "";
    }
    let plant = document.createElement("img");
    plant.src = "./atgm.png.png";

    let num = getRandomTile();
    if (currMoleTile && currMoleTile.id == num) {
        return;
    }
    if (currMoleTile1 && currMoleTile1.id == num) {
        return;
    }
    currPlantTile = document.getElementById(num);
    currPlantTile.appendChild(plant);
}

 function selectTile() {
    if (gameOver) {
        return;
    }
    if (this == currMoleTile) {
        score += 10;
        document.getElementById("score").innerText = score.toString(); //update score html
    }
    else if (this == currMoleTile1) {
        score += 100;
        document.getElementById("score").innerText = score.toString(); //update score html
    }
    else if (this == currPlantTile) {
        score -= 50;
        document.getElementById("score").innerText = score.toString(); //update score html
    }
}