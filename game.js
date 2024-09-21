const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: "game-container",
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

let player1;
let player2;
let cursors;
let wasd;
let trails;
let isComputerOpponent = false;
let startScreen;

let trails1;
let trails2;

const BORDER_SIZE = 2;
const TOP_MARGIN = 30; // Space for counters
const GAME_WIDTH = window.innerWidth;
const GAME_HEIGHT = window.innerHeight;

let powerUp;
let powerUpTimer;
let speedBoostTimer;

let player1Score = 0;
let player2Score = 0;
let player1ScoreText;
let player2ScoreText;
let highScoreText;

let audioContext, gainNode, bassOscillator;
let kickInterval, bassInterval;

function preload() {
  // If there are other assets you need to load, keep them here
}

function create() {
  this.gameRunning = false;
  this.gameStarted = false;

  // Create a larger circular particle texture
  let graphics = this.make.graphics({ x: 0, y: 0, add: false });
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(16, 16, 16);
  graphics.generateTexture("particle", 32, 32);

  // Initialize the particle system
  this.explosionParticles = this.add.particles("particle");
  this.explosionParticles.setDepth(1000);

  console.log("Particle system initialized:", this.explosionParticles);

  startScreen = createStartScreen(this);
  addBorders(this);

  // Configure particle emitters for players
  this.player1EmitterConfig = {
    speed: { min: -200, max: 200 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.5, end: 0 },
    blendMode: "ADD",
    lifespan: { min: 500, max: 1000 },
    gravityY: 0,
    tint: 0x00ff00,
  };

  this.player2EmitterConfig = {
    speed: { min: -200, max: 200 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.5, end: 0 },
    blendMode: "ADD",
    lifespan: { min: 500, max: 1000 },
    gravityY: 0,
    tint: 0xff0000,
  };

  // Initialize score counters
  player1ScoreText = this.add.text(10, 5, "Player 1: 0", {
    fontSize: "24px",
    fill: "#00ff00",
  });
  player2ScoreText = this.add.text(GAME_WIDTH - 10, 5, "Player 2: 0", {
    fontSize: "24px",
    fill: "#ff0000",
  });
  player2ScoreText.setOrigin(1, 0);

  // Initialize high score text
  let currentHighScore = localStorage.getItem("highScore") || 0;
  let currentHighScorePlayer = localStorage.getItem("highScorePlayer") || "";
  highScoreText = this.add.text(
    GAME_WIDTH / 2,
    5,
    `High Score: ${currentHighScorePlayer} - ${currentHighScore}`,
    {
      fontSize: "24px",
      fill: "#ffff00",
    }
  );
  highScoreText.setOrigin(0.5, 0);

  createSoundtrack(this);
}

function explode(player, scene) {
  console.log(
    "Explode function called for player:",
    player === player1 ? "Player 1" : "Player 2"
  );
  let emitterConfig =
    player === player1
      ? scene.player1EmitterConfig
      : scene.player2EmitterConfig;

  if (!scene.explosionEmitter) {
    scene.explosionEmitter = scene.explosionParticles.createEmitter({
      speed: { min: -200, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      blendMode: "ADD",
      lifespan: { min: 500, max: 1000 },
      gravityY: 0,
      quantity: 50,
    });
  }

  scene.explosionEmitter.setPosition(player.x, player.y);
  scene.explosionEmitter.setTint(emitterConfig.tint);
  scene.explosionEmitter.explode();

  createExplosionSound(scene);

  console.log("Particles emitted at:", player.x, player.y);
}

function createExplosionSound(scene) {
  const oscillator = scene.sound.context.createOscillator();
  const gain = scene.sound.context.createGain();

  oscillator.connect(gain);
  gain.connect(scene.sound.context.destination);

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(110, scene.sound.context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    0.01,
    scene.sound.context.currentTime + 0.5
  );

  gain.gain.setValueAtTime(1, scene.sound.context.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.01,
    scene.sound.context.currentTime + 0.5
  );

  oscillator.start();
  oscillator.stop(scene.sound.context.currentTime + 0.5);
}

function spawnPowerUp(scene) {
  console.log("Spawning power-up");
  if (powerUp) {
    explodePowerUp(scene, powerUp);
    powerUp.destroy();
  }
  if (powerUpTimer) powerUpTimer.remove();

  const x = Phaser.Math.Between(
    BORDER_SIZE + 10,
    GAME_WIDTH - BORDER_SIZE - 10
  );
  const y = Phaser.Math.Between(
    TOP_MARGIN + BORDER_SIZE + 10,
    GAME_HEIGHT - BORDER_SIZE - 10
  );

  powerUp = scene.add.circle(x, y, 5, 0xffff00);
  console.log(`Power-up spawned at (${x}, ${y})`);

  // Set up a timer for the power-up to blink before disappearing
  powerUpTimer = scene.time.delayedCall(7000, () => {
    if (powerUp) {
      // Make the power-up blink
      scene.tweens.add({
        targets: powerUp,
        alpha: 0,
        duration: 200,
        ease: "Power2",
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          if (powerUp) {
            explodePowerUp(scene, powerUp);
            powerUp.destroy();
            powerUp = null;
            schedulePowerUpSpawn(scene);
          }
        },
      });
    }
  });
}

function schedulePowerUpSpawn(scene) {
  const delay = Phaser.Math.Between(10000, 30000); // Between 10 and 30 seconds
  scene.time.delayedCall(delay, () => {
    spawnPowerUp(scene);
  });
}

function explodePowerUp(scene, powerUpObj) {
  if (!scene.powerUpEmitter) {
    scene.powerUpEmitter = scene.explosionParticles.createEmitter({
      speed: { min: -200, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      blendMode: "ADD",
      lifespan: 1000,
      gravityY: 0,
      quantity: 50,
      tint: 0xffff00,
    });
  }

  scene.powerUpEmitter.setPosition(powerUpObj.x, powerUpObj.y);
  scene.powerUpEmitter.explode();

  console.log("Power-up exploded at:", powerUpObj.x, powerUpObj.y);
}

function collectPowerUp(scene, player) {
  console.log("Collecting power-up");

  if (!powerUp) return; // If the powerUp no longer exists, exit the function

  explodePowerUp(scene, powerUp);
  createPowerUpSound(scene);

  powerUp.destroy();
  powerUp = null;
  if (powerUpTimer) powerUpTimer.remove();

  // Apply speed boost
  player.speedBoost = 1.05;
  console.log(
    `Speed boost applied to ${
      player === player1 ? "Player 1" : "Player 2/Computer"
    }: ${player.speedBoost}`
  );

  // Remove the previous speed boost timer if it exists
  if (player.speedBoostTimer) player.speedBoostTimer.remove();

  // Create a new speed boost timer
  player.speedBoostTimer = scene.time.delayedCall(20000, () => {
    player.speedBoost = 1;
    console.log(
      `Speed boost ended for ${
        player === player1 ? "Player 1" : "Player 2/Computer"
      }`
    );
  });

  // Add points for collecting power-up
  if (player === player1) {
    player1Score += 150;
  } else {
    player2Score += 150;
  }

  updateScoreDisplay(scene);

  // Schedule the appearance of the next power-up
  schedulePowerUpSpawn(scene);

  console.log("Power-up collection complete");
}

function createPowerUpSound(scene) {
  const oscillator = scene.sound.context.createOscillator();
  const gain = scene.sound.context.createGain();

  oscillator.connect(gain);
  gain.connect(scene.sound.context.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(440, scene.sound.context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    880,
    scene.sound.context.currentTime + 0.1
  );

  gain.gain.setValueAtTime(0.5, scene.sound.context.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.01,
    scene.sound.context.currentTime + 0.1
  );

  oscillator.start();
  oscillator.stop(scene.sound.context.currentTime + 0.1);
}

function createStartScreen(scene) {
  let screenCenterX =
    scene.cameras.main.worldView.x + scene.cameras.main.width / 2;
  let screenCenterY =
    scene.cameras.main.worldView.y + scene.cameras.main.height / 2;

  let screen = scene.add.container(screenCenterX, screenCenterY);

  let title = scene.add.text(0, -100, "TRON", {
    fontSize: "64px",
    fill: "#fff",
  });
  title.setOrigin(0.5);

  let pvpButton = createButton(scene, 0, 0, "Player vs Player", () =>
    startGame(scene, false)
  );
  let pvcButton = createButton(scene, 0, 50, "Player vs Computer", () =>
    startGame(scene, true)
  );

  // Add a button to start the sound
  let soundButton = createButton(scene, 0, 100, "Start Sound", () => {
    createSoundtrack(scene);
    soundButton.setVisible(false); // Hide the button after starting the sound
  }).setVisible(false);

  screen.add([title, pvpButton, pvcButton, soundButton]);

  return screen;
}

function createButton(scene, x, y, text, onClick) {
  let button = scene.add.text(x, y, text, {
    fontSize: "32px",
    fill: "#fff",
    backgroundColor: "#333",
    padding: { left: 10, right: 10, top: 5, bottom: 5 },
  });
  button.setOrigin(0.5);
  button.setInteractive();
  button.on("pointerdown", onClick);
  button.on("pointerover", () => button.setStyle({ fill: "#ff0" }));
  button.on("pointerout", () => button.setStyle({ fill: "#fff" }));
  return button;
}

function startGame(scene, vsComputer) {
  if (scene.gameStarted) {
    // Clear the previous game if it exists
    scene.children.removeAll();
    addBorders(scene);
  }

  scene.gameStarted = true;
  scene.gameRunning = true;
  isComputerOpponent = vsComputer;
  if (startScreen) startScreen.setVisible(false);

  // Stop the soundtrack
  stopSoundtrack();

  // Reinitialize the particle system
  if (scene.explosionParticles) scene.explosionParticles.destroy();
  scene.explosionParticles = scene.add.particles("particle");
  scene.explosionParticles.setDepth(1000);
  scene.explosionEmitter = null; // This will force the recreation of the emitter in the next explosion
  scene.powerUpEmitter = null; // Reinitialize the power-up emitter

  // Reset counters
  player1Score = 0;
  player2Score = 0;

  // Recreate the score texts
  if (player1ScoreText) player1ScoreText.destroy();
  if (player2ScoreText) player2ScoreText.destroy();
  if (highScoreText) highScoreText.destroy();

  player1ScoreText = scene.add.text(10, 5, "Player 1: 0", {
    fontSize: "24px",
    fill: "#00ff00",
  });
  player2ScoreText = scene.add.text(GAME_WIDTH - 10, 5, "Player 2: 0", {
    fontSize: "24px",
    fill: "#ff0000",
  });
  player2ScoreText.setOrigin(1, 0);

  let currentHighScore = localStorage.getItem("highScore") || 0;
  let currentHighScorePlayer = localStorage.getItem("highScorePlayer") || "";
  highScoreText = scene.add.text(
    GAME_WIDTH / 2,
    5,
    `High Score: ${currentHighScorePlayer} - ${currentHighScore}`,
    {
      fontSize: "24px",
      fill: "#ffff00",
    }
  );
  highScoreText.setOrigin(0.5, 0);

  updateScoreDisplay(scene);

  initializeGame(scene);
  spawnPowerUp(scene);
  initializePlayerSounds(scene);
}

function initializeGame(scene) {
  // Create players as rectangles
  player1 = scene.add.rectangle(100, GAME_HEIGHT / 2, 2, 2, 0x00ff00);
  player2 = scene.add.rectangle(
    GAME_WIDTH - 100,
    GAME_HEIGHT / 2,
    2,
    2,
    0xff0000
  );

  player1.speedBoost = 1;
  player2.speedBoost = 1;

  cursors = scene.input.keyboard.createCursorKeys();
  wasd = scene.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D,
  });

  player1.direction = "right";
  player1.lastDirection = "right";
  player2.direction = "left";
  player2.lastDirection = "left";

  // Initialize the trail arrays for each player
  trails1 = [];
  trails2 = [];
}

function addBorders(scene) {
  scene.add.rectangle(
    GAME_WIDTH / 2,
    TOP_MARGIN + BORDER_SIZE / 2,
    GAME_WIDTH,
    BORDER_SIZE,
    0xffffff
  );
  scene.add.rectangle(
    GAME_WIDTH / 2,
    GAME_HEIGHT - BORDER_SIZE / 2,
    GAME_WIDTH,
    BORDER_SIZE,
    0xffffff
  );
  scene.add.rectangle(
    BORDER_SIZE / 2,
    GAME_HEIGHT / 2,
    BORDER_SIZE,
    GAME_HEIGHT - TOP_MARGIN,
    0xffffff
  );
  scene.add.rectangle(
    GAME_WIDTH - BORDER_SIZE / 2,
    GAME_HEIGHT / 2,
    BORDER_SIZE,
    GAME_HEIGHT - TOP_MARGIN,
    0xffffff
  );
}

function update() {
  if (!this.gameRunning) {
    return;
  }

  if (!player1 || !player2) {
    console.log("Players not initialized");
    return;
  }

  // Player 1 movement
  if (player1.active && cursors.left.isDown && player1.direction !== "right") {
    player1.direction = "left";
  } else if (
    player1.active &&
    cursors.right.isDown &&
    player1.direction !== "left"
  ) {
    player1.direction = "right";
  } else if (
    player1.active &&
    cursors.up.isDown &&
    player1.direction !== "down"
  ) {
    player1.direction = "up";
  } else if (
    player1.active &&
    cursors.down.isDown &&
    player1.direction !== "up"
  ) {
    player1.direction = "down";
  }

  // Player 2 movement
  if (!isComputerOpponent) {
    if (player2.active && wasd.left.isDown && player2.direction !== "right") {
      player2.direction = "left";
    } else if (
      player2.active &&
      wasd.right.isDown &&
      player2.direction !== "left"
    ) {
      player2.direction = "right";
    } else if (
      player2.active &&
      wasd.up.isDown &&
      player2.direction !== "down"
    ) {
      player2.direction = "up";
    } else if (
      player2.active &&
      wasd.down.isDown &&
      player2.direction !== "up"
    ) {
      player2.direction = "down";
    }
  } else {
    if (player2.active) {
      computerMove(player2, this);
    }
  }

  // Check collision with power-up
  if (powerUp) {
    console.log("Checking power-up collision");
    if (checkPowerUpCollision(player1, powerUp)) {
      console.log("Player 1 collected power-up");
      collectPowerUp(this, player1);
    } else if (checkPowerUpCollision(player2, powerUp)) {
      console.log("Player 2 collected power-up");
      collectPowerUp(this, player2);
    }
  }

  // Move players
  console.log("Moving players");
  if (player1.active) movePlayer(player1, this);
  if (player2.active) movePlayer(player2, this);
  console.log("Players moved");
}

function checkPowerUpCollision(player, powerUp) {
  const distance = Phaser.Math.Distance.Between(
    player.x,
    player.y,
    powerUp.x,
    powerUp.y
  );
  console.log(`Power-up distance: ${distance}`);
  return distance < 5; // 5 is the radius of the powerUp
}

function movePlayer(player, scene) {
  let speed = 2 * (player.speedBoost || 1);
  let nextPosition = getNextPosition(player, player.direction, speed);

  if (willCollide(nextPosition, player)) {
    console.log("Player collision detected");
    explode(player, scene);
    gameOver(player, scene);
    return;
  }

  // Adjust the sound based on direction
  let oscillator = player === player1 ? player1Oscillator : player2Oscillator;
  let baseFrequency = player === player1 ? 220 : 330; // Different base tones for each player

  if (player.direction !== player.lastDirection) {
    // Change the tone when direction changes
    switch (player.direction) {
      case "up":
        baseFrequency *= 1.2;
        break;
      case "down":
        baseFrequency *= 0.8;
        break;
      case "left":
        baseFrequency *= 1.1;
        break;
      case "right":
        baseFrequency *= 0.9;
        break;
    }
    player.lastDirection = player.direction;
  }

  oscillator.frequency.setValueAtTime(
    (baseFrequency * speed) / 2,
    scene.sound.context.currentTime
  );

  // Add points for each pixel traveled
  if (player === player1) {
    player1Score += speed;
  } else {
    player2Score += speed;
  }

  // Calculate the number of trail segments based on speed
  let segments = Math.ceil(speed);

  for (let i = 0; i < segments; i++) {
    let t = i / segments;
    let x = Phaser.Math.Linear(player.x, nextPosition.x, t);
    let y = Phaser.Math.Linear(player.y, nextPosition.y, t);

    // Create trail segment
    let trail = scene.add.rectangle(x, y, 2, 2, player.fillColor);
    (player === player1 ? trails1 : trails2).push({ x: x, y: y });
  }

  player.x = nextPosition.x;
  player.y = nextPosition.y;

  updateScoreDisplay(scene);
}

function getNextPosition(player, direction, speed) {
  let nextX = player.x;
  let nextY = player.y;

  switch (direction) {
    case "left":
      nextX -= speed;
      break;
    case "right":
      nextX += speed;
      break;
    case "up":
      nextY -= speed;
      break;
    case "down":
      nextY += speed;
      break;
  }

  return { x: nextX, y: nextY };
}

function willCollide(position, player) {
  return (
    isOutOfBounds(position) ||
    isCollidingWithTrails(position, trails1) ||
    isCollidingWithTrails(position, trails2) ||
    isCollidingWithPlayer(position, player, player1) ||
    isCollidingWithPlayer(position, player, player2)
  );
}

function isOutOfBounds(position) {
  return (
    position.x < BORDER_SIZE ||
    position.x > GAME_WIDTH - BORDER_SIZE ||
    position.y < TOP_MARGIN + BORDER_SIZE ||
    position.y > GAME_HEIGHT - BORDER_SIZE
  );
}

function isCollidingWithTrails(position, trails) {
  return trails.some(
    (trail) =>
      Phaser.Math.Distance.Between(position.x, position.y, trail.x, trail.y) < 2
  );
}

function isCollidingWithPlayer(position, currentPlayer, otherPlayer) {
  return (
    currentPlayer !== otherPlayer &&
    position.x === otherPlayer.x &&
    position.y === otherPlayer.y
  );
}

function computerMove(player, scene) {
  const directions = ["up", "down", "left", "right"];
  let bestDirection = player.direction;
  let minDistance = Infinity;
  let target = player1; // By default, the target is player 1
  let safeDirections = [];

  // First, find all safe directions
  directions.forEach((direction) => {
    let futurePosition = getNextPosition(player, direction, 2);
    if (!willCollide(futurePosition, player)) {
      safeDirections.push(direction);
    }
  });

  // If there are safe directions, choose among them
  if (safeDirections.length > 0) {
    // If there's a power-up, change the target to the power-up
    if (powerUp) {
      target = powerUp;
    }

    safeDirections.forEach((direction) => {
      let futurePosition = getNextPosition(player, direction, 2);
      let distance = getDistance(futurePosition, target);

      // If it's a power-up, give it some priority, but not as much as before
      if (target === powerUp) {
        distance -= 100; // Reduce the priority of the power-up
      }

      if (distance < minDistance) {
        minDistance = distance;
        bestDirection = direction;
      }
    });
  } else {
    // If there are no safe directions, try to find the least dangerous one
    console.log("No safe directions, looking for least dangerous");
    directions.forEach((direction) => {
      let futurePosition = getNextPosition(player, direction, 2);
      if (!isOutOfBounds(futurePosition)) {
        bestDirection = direction;
      }
    });
  }

  player.direction = bestDirection;
}

function getDistance(pos1, pos2) {
  return Math.hypot(pos2.x - pos1.x, pos2.y - pos1.y);
}

function updateScoreDisplay(scene) {
  if (player1ScoreText && player2ScoreText) {
    player1ScoreText.setText(`Player 1: ${Math.round(player1Score)}`);
    player2ScoreText.setText(
      `${isComputerOpponent ? "Computer" : "Player 2"}: ${Math.round(
        player2Score
      )}`
    );
  }

  // Update the high score
  let currentHighScore = localStorage.getItem("highScore") || 0;
  let currentHighScorePlayer = localStorage.getItem("highScorePlayer") || "";

  if (player1Score > currentHighScore) {
    localStorage.setItem("highScore", Math.round(player1Score));
    localStorage.setItem("highScorePlayer", "Player 1");
    currentHighScore = Math.round(player1Score);
    currentHighScorePlayer = "Player 1";
  }

  if (player2Score > currentHighScore) {
    localStorage.setItem("highScore", Math.round(player2Score));
    localStorage.setItem(
      "highScorePlayer",
      isComputerOpponent ? "Computer" : "Player 2"
    );
    currentHighScore = Math.round(player2Score);
    currentHighScorePlayer = isComputerOpponent ? "Computer" : "Player 2";
  }

  // Update or create the high score text
  if (highScoreText) {
    highScoreText.setText(
      `High Score: ${currentHighScorePlayer} - ${currentHighScore}`
    );
  } else {
    highScoreText = scene.add.text(
      GAME_WIDTH / 2,
      5,
      `High Score: ${currentHighScorePlayer} - ${currentHighScore}`,
      {
        fontSize: "24px",
        fill: "#ffff00",
      }
    );
    highScoreText.setOrigin(0.5, 0);
  }
}

function initializePlayerSounds(scene) {
  // Player 1
  player1Oscillator = scene.sound.context.createOscillator();
  player1Gain = scene.sound.context.createGain();
  player1Oscillator.connect(player1Gain);
  player1Gain.connect(scene.sound.context.destination);
  player1Oscillator.type = "sawtooth";
  player1Oscillator.frequency.setValueAtTime(
    220,
    scene.sound.context.currentTime
  );
  player1Gain.gain.setValueAtTime(0.1, scene.sound.context.currentTime);
  player1Oscillator.start();

  // Player 2
  player2Oscillator = scene.sound.context.createOscillator();
  player2Gain = scene.sound.context.createGain();
  player2Oscillator.connect(player2Gain);
  player2Gain.connect(scene.sound.context.destination);
  player2Oscillator.type = "sawtooth";
  player2Oscillator.frequency.setValueAtTime(
    220,
    scene.sound.context.currentTime
  );
  player2Gain.gain.setValueAtTime(0.1, scene.sound.context.currentTime);
  player2Oscillator.start();
}

function createSoundtrack(scene) {
  console.log("Creating soundtrack");
  stopSoundtrack(); // Always stop the previous soundtrack

  // Create a new audio context each time
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  console.log("New audio context created:", audioContext);

  gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

  // Kick drum
  function createKick() {
    console.log("Creating kick");
    const oscillator = audioContext.createOscillator();
    const kickGain = audioContext.createGain();
    oscillator.connect(kickGain);
    kickGain.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );
    kickGain.gain.setValueAtTime(1, audioContext.currentTime);
    kickGain.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  // Hi-hat
  function createHiHat() {
    const oscillator = audioContext.createOscillator();
    const hiHatGain = audioContext.createGain();
    oscillator.connect(hiHatGain);
    hiHatGain.connect(audioContext.destination);

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    hiHatGain.gain.setValueAtTime(0.2, audioContext.currentTime);
    hiHatGain.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.05
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  }

  // Rhythm (120 BPM)
  kickInterval = setInterval(() => {
    createKick();
    setTimeout(createHiHat, 250); // Hi-hat halfway between kicks
  }, 500);

  // Bass track
  bassOscillator = audioContext.createOscillator();
  bassOscillator.type = "triangle";
  bassOscillator.frequency.setValueAtTime(55, audioContext.currentTime);
  bassOscillator.connect(gainNode);
  bassOscillator.start();
  console.log("Bass oscillator started");

  // Random bass every 1/4 note
  bassInterval = setInterval(() => {
    const randomNote = 55 * Math.pow(2, Math.floor(Math.random() * 5) / 12);
    bassOscillator.frequency.setValueAtTime(
      randomNote,
      audioContext.currentTime
    );
  }, 250);
}

function stopSoundtrack() {
  console.log("Stopping soundtrack");
  if (bassOscillator) {
    bassOscillator.stop();
    bassOscillator = null;
  }
  if (kickInterval) {
    clearInterval(kickInterval);
    kickInterval = null;
  }
  if (bassInterval) {
    clearInterval(bassInterval);
    bassInterval = null;
  }
  if (audioContext) {
    audioContext.close().then(() => console.log("Audio context closed"));
    audioContext = null;
  }
}

function gameOver(losingPlayer, scene) {
  console.log("Game over");
  scene.gameRunning = false;

  // Stop the players
  if (player1) player1.active = false;
  if (player2) player2.active = false;

  // Stop the player sounds
  if (player1Oscillator) {
    player1Oscillator.stop();
    player1Oscillator = null;
  }
  if (player2Oscillator) {
    player2Oscillator.stop();
    player2Oscillator = null;
  }

  // Restart the soundtrack
  stopSoundtrack();
  createSoundtrack(scene);

  // Show game over screen
  let screenCenterX =
    scene.cameras.main.worldView.x + scene.cameras.main.width / 2;
  let screenCenterY =
    scene.cameras.main.worldView.y + scene.cameras.main.height / 2;

  let screen = scene.add.container(screenCenterX, screenCenterY);

  let gameOverText = scene.add.text(0, -100, "GAME OVER", {
    fontSize: "64px",
    fill: "#fff",
  });
  gameOverText.setOrigin(0.5);

  let winnerText = scene.add.text(
    0,
    0,
    `${losingPlayer === player1 ? "Player 2" : "Player 1"} wins!`,
    {
      fontSize: "32px",
      fill: "#fff",
    }
  );
  winnerText.setOrigin(0.5);

  let restartButton = createButton(scene, 0, 50, "Restart", () =>
    startGame(scene, isComputerOpponent)
  );

  screen.add([gameOverText, winnerText, restartButton]);
}

function getRandomBrightColor() {
  const letters = "89ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}

function togglePause(scene, isPaused) {
  if (isPaused) {
    if (player1Gain)
      player1Gain.gain.setValueAtTime(0, scene.sound.context.currentTime);
    if (player2Gain)
      player2Gain.gain.setValueAtTime(0, scene.sound.context.currentTime);
  } else {
    if (player1Gain)
      player1Gain.gain.setValueAtTime(0.1, scene.sound.context.currentTime);
    if (player2Gain)
      player2Gain.gain.setValueAtTime(0.1, scene.sound.context.currentTime);
  }
}

function restartGame(scene) {
  console.log("Restarting game");

  // Clear the Game Over container if it exists
  if (scene.gameOverContainer) {
    scene.gameOverContainer.removeAll(true); // true to also destroy the children
    scene.gameOverContainer.destroy();
    scene.gameOverContainer = null;
  }

  // Stop all existing tweens
  scene.tweens.killAll();

  // Clear all existing objects in the scene
  scene.children.removeAll(true);

  // Reset game variables
  trails1 = [];
  trails2 = [];
  if (powerUp) {
    powerUp.destroy();
    powerUp = null;
  }
  if (powerUpTimer) powerUpTimer.remove();
  if (speedBoostTimer) speedBoostTimer.remove();

  // Reactivate the players
  if (player1) player1.active = true;
  if (player2) player2.active = true;

  // Restart the scene
  scene.scene.restart();
}
