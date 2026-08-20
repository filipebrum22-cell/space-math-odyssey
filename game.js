/**
 * SPACE MATH ODYSSEY 3D
 * Jogo de Nave Espacial com 5 Quartos, Desafios de Frações e Multiplayer WebRTC P2P
 */

// --- SINTETIZADOR DE ÁUDIO SCI-FI (Web Audio API) ---
class SoundManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playBeep(freq = 800, type = 'sine', duration = 0.1) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playDoorOpen() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(380, this.ctx.currentTime + 1.0);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.0);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);
  }

  playSuccess() {
    this.playBeep(523.25, 'triangle', 0.15); // C5
    setTimeout(() => this.playBeep(659.25, 'triangle', 0.15), 100); // E5
    setTimeout(() => this.playBeep(783.99, 'triangle', 0.25), 200); // G5
  }

  playError() {
    this.playBeep(180, 'sawtooth', 0.25);
    setTimeout(() => this.playBeep(130, 'sawtooth', 0.35), 180);
  }
}

const sounds = new SoundManager();

// Textura procedural simplificada para caixotes (opcional)
function createProceduralTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

// --- QUESTÕES EXATAS DE FRAÇÃO ---
const MathQuestions = [
  // Quarto 1: Adição de Frações
  [
    { q: "3/5 + 2/7 = ?", a: "31/35" },
    { q: "4/9 + 3/8 = ?", a: "59/72" },
    { q: "2/3 + 1/5 + 3/10 = ?", a: "7/6" }
  ],
  // Quarto 2: Subtração de Frações
  [
    { q: "5/6 - 2/3 = ?", a: "1/6" },
    { q: "3/4 - 5/6 = ?", a: "-1/12" },
    { q: "-2/5 - 1/3 = ?", a: "-11/15" }
  ],
  // Quarto 3: Multiplicação de Frações
  [
    { q: "3/4 x 2/5 x 5/6 = ?", a: "1/4" },
    { q: "3/5 x 4/7 = ?", a: "12/35" },
    { q: "-2/3 x 3/8 = ?", a: "-1/4" }
  ],
  // Quarto 4: Divisão de Frações
  [
    { q: "3/5 ÷ 2/7 = ?", a: "21/10" },
    { q: "-4/9 ÷ 2/3 = ?", a: "-2/3" },
    { q: "5/8 ÷ (-3/4) = ?", a: "-5/6" }
  ],
  // Quarto 5: Desafios Mistos
  [
    { q: "3/4 - (1/2 + 1/6) = ?", a: "1/12" },
    { q: "2/3 + 3/5 ÷ 6/7 = ?", a: "41/30" },
    { q: "-2/5 x 3/4 ÷ 1/2 = ?", a: "-3/5" }
  ]
];

// --- ESTADO DO JOGO ---
const gameState = {
  isGameStarted: false,
  unlockedDoors: [false, false, false, false, false],
  currentActiveTerminal: null,
  currentQuestionIndex: 0, 
  isMultiplayer: false,
  peer: null,
  conn: null,
  remotePlayerMesh: null,
  nickname: "Astronauta",
  isHost: false
};

// --- CONFIGURAÇÃO THREE.JS 3D ---
let scene, camera, renderer;
let playerPosition = new THREE.Vector3(0, 1.6, 25); 

// ROTAÇÃO DE CÂMERA NORMAL (Yaw para os lados, Pitch para cima e para baixo)
let playerRotation = { yaw: 0, pitch: 0 };
let targetRotation = { yaw: 0, pitch: 0 };

let doorsList = [];
let terminalsList = [];
let obstaclesList = []; 
let starParticles; 

// Gerenciar Menu
const btnSolo = document.getElementById('btn-mode-solo');
const btnMulti = document.getElementById('btn-mode-multi');
const multiOptions = document.getElementById('multiplayer-options');
const btnStart = document.getElementById('btn-start-mission');

btnSolo.addEventListener('click', () => {
  sounds.playBeep(800, 'sine', 0.05);
  btnSolo.classList.add('active');
  btnMulti.classList.remove('active');
  multiOptions.classList.add('hidden');
  gameState.isMultiplayer = false;
});

btnMulti.addEventListener('click', () => {
  sounds.playBeep(800, 'sine', 0.05);
  btnMulti.classList.add('active');
  btnSolo.classList.remove('active');
  multiOptions.classList.remove('hidden');
  gameState.isMultiplayer = true;
});

// Multiplayer P2P
document.getElementById('btn-menu-create-room').addEventListener('click', () => {
  sounds.playBeep(900, 'sine', 0.08);
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  gameState.peer = new Peer(`space-math-${roomCode}`);

  gameState.peer.on('open', () => {
    document.getElementById('menu-room-info').classList.remove('hidden');
    document.getElementById('menu-room-code').innerText = roomCode;
    document.getElementById('room-status').innerText = `SALA: ${roomCode} (HOST)`;
    gameState.isHost = true;
  });

  gameState.peer.on('connection', (conn) => {
    gameState.conn = conn;
    setupConnectionListeners();
    alert("Astronauta conectado! Pressione INICIAR MISSÃO para começar!");
  });
});

document.getElementById('btn-menu-join').addEventListener('click', () => {
  const code = document.getElementById('menu-join-code').value.trim().toUpperCase();
  if (!code) return;

  sounds.playBeep(900, 'sine', 0.08);
  gameState.peer = new Peer();
  gameState.peer.on('open', () => {
    gameState.conn = gameState.peer.connect(`space-math-${code}`);
    setupConnectionListeners();
    document.getElementById('room-status').innerText = `SALA: ${code} (CLIENTE)`;
    document.getElementById('menu-join-feedback').innerText = "CONECTADO COM SUCESSO!";
  });
});

function setupConnectionListeners() {
  gameState.conn.on('data', (data) => {
    if (data.type === 'POS_UPDATE') {
      gameState.remotePlayerMesh.position.set(data.x, data.y - 0.8, data.z);
    } else if (data.type === 'UNLOCK_DOOR') {
      unlockDoor(data.sectorIndex);
    } else if (data.type === 'START_GAME') {
      enterGameWorld();
    }
  });
}

// Iniciar Jogo
btnStart.addEventListener('click', () => {
  sounds.playBeep(1000, 'sine', 0.15);
  gameState.nickname = document.getElementById('player-nickname').value || "Astronauta";

  if (gameState.isMultiplayer && gameState.conn && gameState.conn.open) {
    gameState.conn.send({ type: 'START_GAME' });
  }
  enterGameWorld();
});

function enterGameWorld() {
  document.getElementById('config-screen').classList.add('hidden');
  gameState.isGameStarted = true;

  setTimeout(() => {
    document.body.requestPointerLock();
  }, 100);

  init3D();
}

// --- CONSTRUÇÃO DO MUNDO 3D ---
function init3D() {
  const container = document.getElementById('canvas-container');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010205);
  scene.fog = new THREE.FogExp2(0x010205, 0.025);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.copy(playerPosition);
  
  // Setar ordem de rotação para evitar problemas estranhos de roll (gimbal lock)
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // --- AMBIENTE E ILUMINAÇÃO BRANCA PURA SCI-FI ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.6); 
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 2.0); 
  mainLight.position.set(10, 30, 20);
  scene.add(mainLight);

  buildSpaceshipMap();
  createOuterSpace(); 

  window.addEventListener('resize', onWindowResize);

  animate();
}

// Criar 5 Quartos com Paredes Cinza Sólidas (Sem Textura), Luzes Brancas e Caixotes
function buildSpaceshipMap() {
  // Material de Parede Cinza Sólido Reflexivo
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x888a99, // Cinza sólido suave de nave
    metalness: 0.85,
    roughness: 0.2
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a5568, 
    metalness: 0.9,
    roughness: 0.15
  });

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d3748, 
    metalness: 0.9,
    roughness: 0.2
  });

  const corridorWidth = 6;
  const corridorHeight = 4;
  const totalLength = 110; 

  // Chão e Teto
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(corridorWidth, totalLength), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -30);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(corridorWidth, totalLength), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, corridorHeight, -30);
  scene.add(ceiling);

  // Construir paredes laterais com janelas
  const wallSegmentGeo = new THREE.PlaneGeometry(10, corridorHeight);
  
  for (let z = 25; z >= -85; z -= 15) {
    const segLeft = new THREE.Mesh(wallSegmentGeo, wallMaterial);
    segLeft.rotation.y = Math.PI / 2;
    segLeft.position.set(-corridorWidth / 2, corridorHeight / 2, z);
    scene.add(segLeft);

    const segRight = new THREE.Mesh(wallSegmentGeo, wallMaterial);
    segRight.rotation.y = -Math.PI / 2;
    segRight.position.set(corridorWidth / 2, corridorHeight / 2, z);
    scene.add(segRight);

    const winZ = z - 7.5;
    
    // Vidro da Janela transparente
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xe2f1ff,
      transparent: true,
      opacity: 0.25,
      metalness: 0.98,
      roughness: 0.02
    });

    const windowGeo = new THREE.PlaneGeometry(5, corridorHeight - 0.8);

    const winLeft = new THREE.Mesh(windowGeo, windowMat);
    winLeft.rotation.y = Math.PI / 2;
    winLeft.position.set(-corridorWidth / 2 + 0.02, corridorHeight / 2, winZ);
    scene.add(winLeft);

    const winRight = new THREE.Mesh(windowGeo, windowMat);
    winRight.rotation.y = -Math.PI / 2;
    winRight.position.set(corridorWidth / 2 - 0.02, corridorHeight / 2, winZ);
    scene.add(winRight);

    // Moldura das Janelas (Aço escuro)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, metalness: 0.95 });
    const topFrameGeo = new THREE.BoxGeometry(0.1, 0.2, 5);

    const frameLeftTop = new THREE.Mesh(topFrameGeo, frameMat);
    frameLeftTop.position.set(-corridorWidth / 2 + 0.01, corridorHeight - 0.4, winZ);
    scene.add(frameLeftTop);

    const frameLeftBot = new THREE.Mesh(topFrameGeo, frameMat);
    frameLeftBot.position.set(-corridorWidth / 2 + 0.01, 0.4, winZ);
    scene.add(frameLeftBot);

    const frameRightTop = new THREE.Mesh(topFrameGeo, frameMat);
    frameRightTop.position.set(corridorWidth / 2 - 0.01, corridorHeight - 0.4, winZ);
    scene.add(frameRightTop);

    const frameRightBot = new THREE.Mesh(topFrameGeo, frameMat);
    frameRightBot.position.set(corridorWidth / 2 - 0.01, 0.4, winZ);
    scene.add(frameRightBot);
  }

  // Posicionamento Z das 5 Portas (Quartos)
  const doorPositionsZ = [15, -5, -25, -45, -65];
  const sectorNames = [
    "QUARTO 1 - ADIÇÃO",
    "QUARTO 2 - SUBTRAÇÃO",
    "QUARTO 3 - MULTIPLICAÇÃO",
    "QUARTO 4 - DIVISÃO",
    "QUARTO 5 - DESAFIOS MISTOS"
  ];

  doorPositionsZ.forEach((posZ, index) => {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 0, posZ);

    const doorLeft = new THREE.Mesh(
      new THREE.BoxGeometry(corridorWidth / 2, corridorHeight, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.95, roughness: 0.1 })
    );
    doorLeft.position.set(-corridorWidth / 4, corridorHeight / 2, 0);

    const doorRight = new THREE.Mesh(
      new THREE.BoxGeometry(corridorWidth / 2, corridorHeight, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.95, roughness: 0.1 })
    );
    doorRight.position.set(corridorWidth / 4, corridorHeight / 2, 0);

    doorGroup.add(doorLeft, doorRight);
    scene.add(doorGroup);

    // Luz de status da porta (Vermelho/Verde)
    const doorLight = new THREE.PointLight(0xff2a5f, 2.0, 6);
    doorLight.position.set(0, corridorHeight - 0.5, posZ + 0.5);
    scene.add(doorLight);

    // Luz de teto branca
    const ceilingNeon = new THREE.PointLight(0xffffff, 2.2, 10);
    ceilingNeon.position.set(0, corridorHeight - 0.2, posZ + 4);
    scene.add(ceilingNeon);

    doorsList.push({
      group: doorGroup,
      left: doorLeft,
      right: doorRight,
      light: doorLight,
      posZ: posZ,
      isUnlocked: false
    });

    // Terminal de Acesso
    const terminalGeo = new THREE.BoxGeometry(0.5, 1.1, 0.25);
    const terminalMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0088ff,
      emissiveIntensity: 0.7,
      roughness: 0.05
    });
    const terminalMesh = new THREE.Mesh(terminalGeo, terminalMat);
    terminalMesh.position.set(-corridorWidth / 2 + 0.35, 1.4, posZ + 1.5);
    scene.add(terminalMesh);

    terminalsList.push({
      mesh: terminalMesh,
      sectorIndex: index,
      sectorName: sectorNames[index],
      posZ: posZ
    });
  });

  // Avatar do Parceiro
  const avatarGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.4, 16);
  const avatarMat = new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 0.6, roughness: 0.3 });
  gameState.remotePlayerMesh = new THREE.Mesh(avatarGeo, avatarMat);
  gameState.remotePlayerMesh.position.set(0, -100, 0);
  scene.add(gameState.remotePlayerMesh);

  // Criar caixotes cenográficos
  createCrates(corridorWidth);
}

// Criação de caixotes com textura cinza simples
function createCrates(corridorWidth) {
  const crateMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a6578,
    bumpMap: createProceduralTexture(), 
    bumpScale: 0.02,
    metalness: 0.9,
    roughness: 0.25
  });

  const detailMaterial = new THREE.MeshStandardMaterial({
    color: 0xdd6b20, 
    metalness: 0.5,
    roughness: 0.4
  });

  const cratePositions = [
    { x: -corridorWidth/2 + 0.9, z: 20, size: 0.8 },
    { x: corridorWidth/2 - 0.9, z: 10, size: 1.0 },
    { x: -corridorWidth/2 + 1.0, z: -12, size: 1.2 },
    { x: corridorWidth/2 - 0.9, z: -20, size: 0.7 },
    { x: -corridorWidth/2 + 0.9, z: -35, size: 1.1 },
    { x: corridorWidth/2 - 0.9, z: -55, size: 0.9 },
    { x: -corridorWidth/2 + 0.8, z: -72, size: 1.0 }
  ];

  cratePositions.forEach((pos) => {
    const crateGroup = new THREE.Group();
    crateGroup.position.set(pos.x, pos.size / 2, pos.z);
    
    const boxMesh = new THREE.Mesh(
      new THREE.BoxGeometry(pos.size, pos.size, pos.size),
      crateMaterial
    );
    crateGroup.add(boxMesh);

    const stripeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(pos.size * 1.02, pos.size * 0.15, pos.size * 1.02),
      detailMaterial
    );
    stripeMesh.position.y = 0;
    crateGroup.add(stripeMesh);

    crateGroup.rotation.y = (Math.random() - 0.5) * 0.3;
    
    scene.add(crateGroup);

    obstaclesList.push({
      x: pos.x,
      z: pos.z,
      radius: pos.size * 0.7 
    });
  });
}

// --- CRIAR ESPAÇO SIDERAL DINÂMICO ---
function createOuterSpace() {
  const particleCount = 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 160 + (Math.random() > 0.5 ? 15 : -15); 
    positions[i + 1] = (Math.random() - 0.5) * 100;
    positions[i + 2] = (Math.random() - 0.5) * 200 - 30; 
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.35,
    transparent: true,
    opacity: 0.95
  });

  starParticles = new THREE.Points(geometry, material);
  scene.add(starParticles);

  const planetGeo = new THREE.SphereGeometry(12, 32, 32);
  const planetMat = new THREE.MeshBasicMaterial({ color: 0x4f46e5, wireframe: true });
  const planet = new THREE.Mesh(planetGeo, planetMat);
  planet.position.set(40, 10, -50);
  scene.add(planet);

  const planet2Geo = new THREE.SphereGeometry(6, 32, 32);
  const planet2Mat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, wireframe: true });
  const planet2 = new THREE.Mesh(planet2Geo, planet2Mat);
  planet2.position.set(-45, -15, -30);
  scene.add(planet2);
}

function animateOuterSpace() {
  if (starParticles) {
    const positions = starParticles.geometry.attributes.position.array;
    for (let i = 2; i < positions.length; i += 3) {
      positions[i] += 0.25; 
      if (positions[i] > 40) {
        positions[i] = -160; 
      }
    }
    starParticles.geometry.attributes.position.needsUpdate = true;
  }
}

// --- CONTROLES E FÍSICA ---
const keys = { w: false, a: false, s: false, d: false };
let isPointerLocked = false;

document.addEventListener('keydown', (e) => {
  if (!gameState.isGameStarted) return;
  if (e.key.toLowerCase() === 'w') keys.w = true;
  if (e.key.toLowerCase() === 'a') keys.a = true;
  if (e.key.toLowerCase() === 's') keys.s = true;
  if (e.key.toLowerCase() === 'd') keys.d = true;

  if (e.key.toLowerCase() === 'e') {
    checkTerminalInteraction();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key.toLowerCase() === 'w') keys.w = false;
  if (e.key.toLowerCase() === 'a') keys.a = false;
  if (e.key.toLowerCase() === 's') keys.s = false;
  if (e.key.toLowerCase() === 'd') keys.d = false;
});

document.getElementById('canvas-container').addEventListener('click', () => {
  if (gameState.isGameStarted && !isModalOpen()) {
    document.body.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = (document.pointerLockElement === document.body);
});

// ROTAÇÃO SUAVE NORMAL DE CÂMERA (Yaw para os lados, Pitch para cima e para baixo de forma limpa)
document.addEventListener('mousemove', (e) => {
  if (isPointerLocked) {
    targetRotation.yaw -= e.movementX * 0.0016; 
    targetRotation.pitch -= e.movementY * 0.0016;
    // Limita o pitch vertical para evitar rotações capotadas estranhas
    targetRotation.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotation.pitch));
  }
});

function isModalOpen() {
  return !document.getElementById('math-terminal-modal').classList.contains('hidden') ||
         !document.getElementById('config-screen').classList.contains('hidden') ||
         !document.getElementById('victory-modal').classList.contains('hidden');
}

// Movimentação do Jogador com Colisão
function updatePlayerMovement(delta) {
  if (isModalOpen() || !gameState.isGameStarted) return;

  const speed = 5.2 * delta;
  // O movimento horizontal permanece nivelado no plano X/Z
  const forward = new THREE.Vector3(-Math.sin(playerRotation.yaw), 0, -Math.cos(playerRotation.yaw));
  const right = new THREE.Vector3(Math.cos(playerRotation.yaw), 0, -Math.sin(playerRotation.yaw));

  const moveDir = new THREE.Vector3();
  if (keys.w) moveDir.add(forward);
  if (keys.s) moveDir.sub(forward);
  if (keys.d) moveDir.add(right);
  if (keys.a) moveDir.sub(right);
  moveDir.normalize();

  const nextPos = playerPosition.clone().addScaledVector(moveDir, speed);

  nextPos.x = Math.max(-2.4, Math.min(2.4, nextPos.x));
  nextPos.z = Math.max(-78, Math.min(28, nextPos.z));

  let canMoveZ = true;
  doorsList.forEach(door => {
    if (!door.isUnlocked) {
      if (Math.abs(nextPos.z - door.posZ) < 0.6) {
        canMoveZ = false;
      }
    }
  });

  let canMoveObstacle = true;
  obstaclesList.forEach(obs => {
    const dx = nextPos.x - obs.x;
    const dz = nextPos.z - obs.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < obs.radius) {
      canMoveObstacle = false;
    }
  });

  if (canMoveZ && canMoveObstacle) {
    playerPosition.z = nextPos.z;
  }
  if (canMoveObstacle) {
    playerPosition.x = nextPos.x;
  }

  // Interpolação suave normal para ambos os eixos
  playerRotation.yaw += (targetRotation.yaw - playerRotation.yaw) * 0.15;
  playerRotation.pitch += (targetRotation.pitch - playerRotation.pitch) * 0.15;

  camera.position.copy(playerPosition);
  // Aplica yaw (horizontal) e pitch (vertical), mantendo roll (eixo Z) estritamente travado em 0
  camera.rotation.set(playerRotation.pitch, playerRotation.yaw, 0); 

  if (gameState.conn && gameState.conn.open) {
    gameState.conn.send({
      type: 'POS_UPDATE',
      x: playerPosition.x,
      y: playerPosition.y,
      z: playerPosition.z
    });
  }

  checkTerminalProximity();
}

function checkTerminalProximity() {
  let nearTerminal = null;
  terminalsList.forEach(term => {
    const dist = playerPosition.distanceTo(term.mesh.position);
    if (dist < 2.2 && !doorsList[term.sectorIndex].isUnlocked) {
      nearTerminal = term;
    }
  });

  const prompt = document.getElementById('interaction-prompt');
  if (nearTerminal) {
    prompt.style.display = 'block';
    gameState.currentActiveTerminal = nearTerminal;
  } else {
    prompt.style.display = 'none';
    gameState.currentActiveTerminal = null;
  }
}

function checkTerminalInteraction() {
  if (gameState.currentActiveTerminal && !isModalOpen()) {
    sounds.playBeep(900, 'sine', 0.1);
    document.exitPointerLock();

    gameState.currentQuestionIndex = 0; 
    showQuestionInTerminal();
  }
}

function showQuestionInTerminal() {
  const term = gameState.currentActiveTerminal;
  const sectorIdx = term.sectorIndex;
  
  const questionObj = MathQuestions[sectorIdx][gameState.currentQuestionIndex];
  
  document.getElementById('terminal-sector-desc').innerText = term.sectorName;
  document.getElementById('terminal-question-index').innerText = `DESAFIO ${gameState.currentQuestionIndex + 1} DE 3`;
  document.getElementById('question-text').innerText = questionObj.q;
  document.getElementById('math-answer-input').value = '';
  document.getElementById('terminal-feedback').innerText = '';
  document.getElementById('math-terminal-modal').classList.remove('hidden');
  document.getElementById('math-answer-input').focus();
}

// Enviar Resposta
document.getElementById('btn-submit-answer').addEventListener('click', submitMathAnswer);
document.getElementById('math-answer-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitMathAnswer();
});

function submitMathAnswer() {
  const ansInput = document.getElementById('math-answer-input').value.replace(/\s+/g, '');
  const term = gameState.currentActiveTerminal;
  const sectorIdx = term.sectorIndex;
  const currentQuestion = MathQuestions[sectorIdx][gameState.currentQuestionIndex];
  
  const feedback = document.getElementById('terminal-feedback');

  if (!ansInput) {
    feedback.innerText = "INSIRA UMA RESPOSTA!";
    feedback.style.color = "var(--accent-orange)";
    sounds.playError();
    return;
  }

  if (ansInput === currentQuestion.a) {
    sounds.playSuccess();
    feedback.innerText = "CORRETO!";
    feedback.style.color = "var(--accent-green)";

    setTimeout(() => {
      gameState.currentQuestionIndex++;
      if (gameState.currentQuestionIndex < 3) {
        showQuestionInTerminal();
      } else {
        unlockDoor(sectorIdx);
        
        if (gameState.conn && gameState.conn.open) {
          gameState.conn.send({ type: 'UNLOCK_DOOR', sectorIndex: sectorIdx });
        }
        
        document.getElementById('math-terminal-modal').classList.add('hidden');
        document.body.requestPointerLock();
      }
    }, 1000);

  } else {
    sounds.playError();
    feedback.innerText = "RESPOSTA INCORRETA! VERIFIQUE SUA FRAÇÃO.";
    feedback.style.color = "var(--danger-red)";
  }
}

function unlockDoor(sectorIdx) {
  const door = doorsList[sectorIdx];
  if (door.isUnlocked) return;

  door.isUnlocked = true;
  gameState.unlockedDoors[sectorIdx] = true;
  sounds.playDoorOpen();

  door.light.color.setHex(0x00ff88);

  const count = gameState.unlockedDoors.filter(Boolean).length;
  document.getElementById('doors-unlocked').innerText = `${count} / 5`;
  document.getElementById('current-sector').innerText = `${Math.min(5, sectorIdx + 2)} / 5`;

  let progress = 0;
  const interval = setInterval(() => {
    progress += 0.05;
    door.left.position.x = -1.5 - progress * 1.5;
    door.right.position.x = 1.5 + progress * 1.5;
    if (progress >= 1) {
      clearInterval(interval);
    }
  }, 25);

  if (count === 5) {
    setTimeout(() => {
      document.exitPointerLock();
      document.getElementById('victory-modal').classList.remove('hidden');
    }, 1200);
  }
}

// Teclado holográfico na tela
document.querySelectorAll('.num-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sounds.playBeep(700, 'sine', 0.04);
    const val = btn.getAttribute('data-val');
    const input = document.getElementById('math-answer-input');

    if (val === 'clear') {
      input.value = '';
    } else if (val === 'backspace') {
      input.value = input.value.slice(0, -1);
    } else if (val !== '') {
      input.value += val;
    }
    input.focus();
  });
});

document.getElementById('btn-close-terminal').addEventListener('click', () => {
  document.getElementById('math-terminal-modal').classList.add('hidden');
  document.body.requestPointerLock();
});

// Reiniciar jogo
document.getElementById('btn-restart-game').addEventListener('click', () => {
  window.location.reload();
});

// Render Loop
let clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  updatePlayerMovement(delta);
  animateOuterSpace(); 
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
