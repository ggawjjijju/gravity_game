import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB_q_wz2IMmKJ66web7eJI_O8kurf3Igfc",
    authDomain: "gravitygame-ddcf7.firebaseapp.com",
    projectId: "gravitygame-ddcf7",
    storageBucket: "gravitygame-ddcf7.firebasestorage.app",
    messagingSenderId: "119090045040",
    appId: "1:119090045040:web:4cbb4cae957903aeef14b5",
    measurementId: "G-REB9Y31N56"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const player = document.getElementById("player");
const point = document.getElementById("point");

const gameMenu = document.getElementById("menu");
const gameOver = document.getElementById("gameover");
const game = document.getElementById("game");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const rankList = document.getElementById("rankList");
const finalScore = document.getElementById("finalScore");

const GAME_WIDTH = 600;
const GAME_HEIGHT = 250;

const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;
const PLAYER_X = 60;

const ENEMY_WIDTH = 30;
const ENEMY_HEIGHT = 90;

const MAX_PLAYER_Y = GAME_HEIGHT - PLAYER_HEIGHT;

let playerY = 0;
let velocity = 0;

let gravityDirection = -1;
let gravityPower = 0.6;

let score = 0;

let enemySpeed = 5;
let enemyMaxSpeed = 25;

let enemies = [];

let Timer = 0;
let spawnTimer = 0;
let spawnInterval = 90;

let gameState = "menu";

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

function flipGravity(){
    if(gameState != "playing"){
        return;
    }

    gravityDirection *= -1;
    velocity = 0;
}

document.addEventListener("keydown", function(e){
    if(e.code == "Space" && !e.repeat){
        flipGravity();
    }
});

game.addEventListener("pointerdown", function(e){
    e.preventDefault();
    flipGravity();
});

async function saveScore(){
    const finalScore = Math.floor(score);

    await addDoc(collection(db, "scores"), {
        score: finalScore,
        createdAt: Date.now()
    });

    await updateScoreBoard();
}

async function updateScoreBoard(){
    const q = query(
        collection(db, "scores"),
        orderBy("score", "desc"),
        limit(5)
    );

    const snapshot = await getDocs(q);

    rankList.innerHTML = "";

    let count = 0;

    snapshot.forEach(function(doc){
        const data = doc.data();

        const li = document.createElement("li");
        li.textContent = data.score;

        rankList.appendChild(li);

        count++;
    });

    while(count < 5){
        const li = document.createElement("li");
        li.textContent = "-";

        rankList.appendChild(li);

        count++;
    }
}

function startGame(){
    resetGame();

    gameState = "playing";

    gameMenu.style.display = "none";
    gameOver.style.display = "none";
    game.style.display = "block";
}

function restartGame(){
    resetGame();

    gameState = "playing";

    gameOver.style.display = "none";
    game.style.display = "block";
}

function resetGame(){
    playerY = 0;
    velocity = 0;

    gravityDirection = -1;

    score = 0;
    enemySpeed = 5;

    Timer = 0;
    spawnTimer = 0;
    spawnInterval = 90;

    point.textContent = score;
    player.style.bottom = playerY + "px";

    clearEnemies();
}

function clearEnemies(){
    for(let i = 0; i < enemies.length; i++){
        enemies[i].element.remove();
    }

    enemies = [];
}

function spawnEnemy(){
    const enemyElement = document.createElement("div");

    enemyElement.classList.add("enemy");

    const enemy = {
        element: enemyElement,
        x: GAME_WIDTH,
        type: "bottom"
    };

    if(Math.random() < 0.5){
        enemy.type = "bottom";

        enemyElement.style.bottom = "0px";
        enemyElement.style.top = "auto";
    }
    else{
        enemy.type = "top";

        enemyElement.style.top = "0px";
        enemyElement.style.bottom = "auto";
    }

    enemyElement.style.left = enemy.x + "px";

    game.appendChild(enemyElement);
    enemies.push(enemy);
}

function updatePlayer(){
    velocity += gravityPower * gravityDirection;
    playerY += velocity;

    if(playerY < 0){
        playerY = 0;
        velocity = 0;
    }

    if(playerY > MAX_PLAYER_Y){
        playerY = MAX_PLAYER_Y;
        velocity = 0;
    }

    player.style.bottom = playerY + "px";
}

function updateDifficulty(){
    enemySpeed = 5 + Math.floor(score / 100);

    if(enemySpeed > enemyMaxSpeed){
        enemySpeed = enemyMaxSpeed;
    }

    spawnInterval = 90 - Math.floor(score / 100) * 5;

    if(spawnInterval < 0){
        spawnInterval = 0;
    }
}

function updateSpawn(){
    spawnTimer++;

    if(spawnTimer >= spawnInterval){
        spawnEnemy();
        spawnTimer = 0;
    }
}

function moveEnemies(){
    for(let i = enemies.length - 1; i >= 0; i--){
        const enemy = enemies[i];

        enemy.x -= enemySpeed;
        enemy.element.style.left = enemy.x + "px";

        if(enemy.x < -ENEMY_WIDTH){
            enemy.element.remove();
            enemies.splice(i, 1);

            const bonus = 30 + Math.floor(Timer / 250) * 10;

            score += bonus;
            updateScore();
        }
    }
}

function addTimeScore(){
    score += 0.1 + Math.floor(Timer / 250) * 0.1;
    updateScore();
}

function updateScore(){
    point.textContent = Math.floor(score);
}

async function endGame(){
    if(gameState == "gameover"){
        return;
    }

    gameState = "gameover";

    finalScore.textContent = "Score: " + Math.floor(score);

    await saveScore();

    game.style.display = "none";
    gameOver.style.display = "flex";
}

function collision(){
    const playerLeft = PLAYER_X;
    const playerRight = PLAYER_X + PLAYER_WIDTH;

    const playerBottom = playerY;
    const playerTop = playerY + PLAYER_HEIGHT;

    for(let i = 0; i < enemies.length; i++){
        const enemy = enemies[i];

        const enemyLeft = enemy.x;
        const enemyRight = enemy.x + ENEMY_WIDTH;

        const xOverlap = enemyRight > playerLeft && enemyLeft < playerRight;

        if(!xOverlap){
            continue;
        }

        let enemyBottom;
        let enemyTop;

        if(enemy.type == "bottom"){
            enemyBottom = 0;
            enemyTop = ENEMY_HEIGHT;
        }
        else{
            enemyBottom = GAME_HEIGHT - ENEMY_HEIGHT;
            enemyTop = GAME_HEIGHT;
        }

        const yOverlap = playerTop > enemyBottom && playerBottom < enemyTop;

        if(yOverlap){
            endGame();
            return;
        }
    }
}

function gameLoop(){
    if(gameState != "playing"){
        return;
    }

    Timer++;

    updateDifficulty();
    updatePlayer();
    updateSpawn();
    moveEnemies();
    collision();
    addTimeScore();
}

updateScoreBoard();
setInterval(gameLoop, 20);
