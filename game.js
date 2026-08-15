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

// --- QUESTÕES EXATAS DE FRAÇÃO DA IMAGEM ---
const MathQuestions = [
  // Quarto 1: Adição de Frações
  [
    { q: "15/70 + 16/57 = ?", a: "395/798" },
    { q: "37/57 + 18/24 = ?", a: "319/228" },
    { q: "30/33 + 3/7 + 16/18 = ?", a: "1543/693" }
  ],
  // Quarto 2: Subtração de Frações
  [
    { q: "13/21 - 3/7 = ?", a: "4/21" },
    { q: "15/36 - 17/22 = ?", a: "-47/132" },
    { q: "50/67 - 37/40 = ?", a: "-479/2680" }
  ],
  // Quarto 3: Multiplicação de Frações
  [
    { q: "83/88 x 3/8 x 7/8 = ?", a: "1743/5632" },
    { q: "12/20 x 23/35 = ?", a: "69/175" },
    { q: "47/71 x 78/85 = ?", a: "3666/6035" }
  ],
  // Quarto 4: Divisão de Frações
  [
    { q: "19/37 ÷ 7/36 = ?", a: "684/259" },
    { q: "26/69 ÷ 50/64 = ?", a: "832/1725" },
    { q: "74/80 ÷ 79/86 = ?", a: "1591/1580" }
  ],
  // Quarto 5: Desafios Mistos
  [
    { q: "18/28 - (6/10 + 22/36) = ?", a: "-179/315" },
    { q: "6/7 + 30/83 ÷ 33/77 = ?", a: "988/581" },
    { q: "26/70 x 16/22 ÷ 27/57 = ?", a: "1976/3465" }
  ]
];

// --- ESTADO DO JOGO ---
const gameState = {
  isGameStarted: false,
  unlockedDoors: [false, false, false, false, false],
  currentActiveTerminal: null,
  currentQuestionIndex: 0, // Índice da pergunta do terminal (0 a 2)
  isMultiplayer: false,
  peer: null,
  conn: null,
  remotePlayerMesh: null,
  nickname: "Astronauta",
  isHost: false
};

// --- CONFIGURAÇÃO THREE.JS 3D ---
let scene, camera, renderer;
let playerPosition = new THREE.Vector3(0, 1.6, 25); // Posição de início recuada
let playerRotation = { yaw: 0, pitch: 0 };
let doorsList = [];
let terminalsList = [];

// Gerenciar Menu e Modos de Configuração
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
    // Notificar o parceiro para começar o jogo também
    gameState.conn.send({ type: 'START_GAME' });
  }
  enterGameWorld();
});

function enterGameWorld() {
  document.getElementById('config-screen').classList.add('hidden');
  gameState.isGameStarted = true;

  // Iniciar Pointer Lock para FPS
  setTimeout(() => {
    document.body.requestPointerLock();
  }, 100);

  init3D();
}

// --- CONSTRUÇÃO DO MUNDO 3D ---
function init3D() {
  const container = document.getElementById('canvas-container');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030611);
  scene.fog = new THREE.FogExp2(0x030611, 0.03);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.copy(playerPosition);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Luzes
  const ambientLight = new THREE.AmbientLight(0x111b2c, 1.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x00f0ff, 0.9);
  dirLight.position.set(5, 20, 15);
  scene.add(dirLight);

  buildSpaceshipMap();

  window.addEventListener('resize', onWindowResize);

  animate();
}

// Criar 5 Quartos Espaciais Consecutivos
function buildSpaceshipMap() {
  const textureLoader = new THREE.TextureLoader();
  const metalTexture = textureLoader.load('hull_texture.jpg');
  metalTexture.wrapS = THREE.RepeatWrapping;
  metalTexture.wrapT = THREE.RepeatWrapping;
  metalTexture.repeat.set(5, 5);

  const wallMaterial = new THREE.MeshStandardMaterial({
    map: metalTexture,
    metalness: 0.85,
    roughness: 0.25
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x070e20,
    metalness: 0.9,
    roughness: 0.2
  });

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x040815,
    metalness: 0.7,
    roughness: 0.4
  });

  const corridorWidth = 6;
  const corridorHeight = 4;
  const totalLength = 110; // Corredor estendido para 5 quartos

  // Chão e Teto
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(corridorWidth, totalLength), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -30);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(corridorWidth, totalLength), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, corridorHeight, -30);
  scene.add(ceiling);

  // Paredes
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(totalLength, corridorHeight), wallMaterial);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-corridorWidth / 2, corridorHeight / 2, -30);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(totalLength, corridorHeight), wallMaterial);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(corridorWidth / 2, corridorHeight / 2, -30);
  scene.add(rightWall);

  createSpaceWindows();

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
    // Grupo da Porta
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 0, posZ);

    const doorLeft = new THREE.Mesh(
      new THREE.BoxGeometry(corridorWidth / 2, corridorHeight, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1a2436, metalness: 0.9, roughness: 0.1 })
    );
    doorLeft.position.set(-corridorWidth / 4, corridorHeight / 2, 0);

    const doorRight = new THREE.Mesh(
      new THREE.BoxGeometry(corridorWidth / 2, corridorHeight, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1a2436, metalness: 0.9, roughness: 0.1 })
    );
    doorRight.position.set(corridorWidth / 4, corridorHeight / 2, 0);

    doorGroup.add(doorLeft, doorRight);
    scene.add(doorGroup);

    // Luz da Porta (Neon Vermelho trancado)
    const doorLight = new THREE.PointLight(0xff2a5f, 1.8, 6);
    doorLight.position.set(0, corridorHeight - 0.5, posZ + 0.5);
    scene.add(doorLight);

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
      emissiveIntensity: 0.6,
      roughness: 0.1
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
  const avatarGeo = new THREE.CapsuleGeometry(0.35, 1.1, 8, 16);
  const avatarMat = new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 0.6, roughness: 0.3 });
  gameState.remotePlayerMesh = new THREE.Mesh(avatarGeo, avatarMat);
  gameState.remotePlayerMesh.position.set(0, -100, 0); // fora da cena inicialmente
  scene.add(gameState.remotePlayerMesh);
}

// Janelas espaciais para o infinito
function createSpaceWindows() {
  const windowGeo = new THREE.PlaneGeometry(6, 2.5);
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x000008 });

  for (let z = 20; z >= -75; z -= 18) {
    const winLeft = new THREE.Mesh(windowGeo, windowMat);
    winLeft.rotation.y = Math.PI / 2;
    winLeft.position.set(-2.99, 2, z);
    scene.add(winLeft);

    const winRight = new THREE.Mesh(windowGeo, windowMat);
    winRight.rotation.y = -Math.PI / 2;
    winRight.position.set(2.99, 2, z);
    scene.add(winRight);
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

document.addEventListener('mousemove', (e) => {
  if (isPointerLocked) {
    playerRotation.yaw -= e.movementX * 0.0028;
    playerRotation.pitch -= e.movementY * 0.0028;
    playerRotation.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, playerRotation.pitch));
  }
});

function isModalOpen() {
  return !document.getElementById('math-terminal-modal').classList.contains('hidden') ||
         !document.getElementById('config-screen').classList.contains('hidden') ||
         !document.getElementById('victory-modal').classList.contains('hidden');
}

function updatePlayerMovement(delta) {
  if (isModalOpen() || !gameState.isGameStarted) return;

  const speed = 5.2 * delta;
  const forward = new THREE.Vector3(-Math.sin(playerRotation.yaw), 0, -Math.cos(playerRotation.yaw));
  const right = new THREE.Vector3(Math.cos(playerRotation.yaw), 0, -Math.sin(playerRotation.yaw));

  const moveDir = new THREE.Vector3();
  if (keys.w) moveDir.add(forward);
  if (keys.s) moveDir.sub(forward);
  if (keys.d) moveDir.add(right);
  if (keys.a) moveDir.sub(right);
  moveDir.normalize();

  const nextPos = playerPosition.clone().addScaledVector(moveDir, speed);

  // Limites físicos da Nave
  nextPos.x = Math.max(-2.4, Math.min(2.4, nextPos.x));
  nextPos.z = Math.max(-78, Math.min(28, nextPos.z));

  // Impedir passagem por portas fechadas
  let canMoveZ = true;
  doorsList.forEach(door => {
    if (!door.isUnlocked) {
      if (Math.abs(nextPos.z - door.posZ) < 0.6) {
        canMoveZ = false;
      }
    }
  });

  if (canMoveZ) {
    playerPosition.z = nextPos.z;
  }
  playerPosition.x = nextPos.x;

  camera.position.copy(playerPosition);
  camera.rotation.set(0, 0, 0);
  camera.rotation.y = playerRotation.yaw;
  camera.rotation.x = playerRotation.pitch;

  // Transmitir posição
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

// Abrir Terminal de Matemática com 3 Desafios
function checkTerminalInteraction() {
  if (gameState.currentActiveTerminal && !isModalOpen()) {
    sounds.playBeep(900, 'sine', 0.1);
    document.exitPointerLock();

    gameState.currentQuestionIndex = 0; // Inicia na Pergunta 1
    showQuestionInTerminal();
  }
}

function showQuestionInTerminal() {
  const term = gameState.currentActiveTerminal;
  const sectorIdx = term.sectorIndex;
  
  // Obter pergunta do quarto e index correspondente
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

  // Comparar como string para aceitar frações perfeitas
  if (ansInput === currentQuestion.a) {
    sounds.playSuccess();
    feedback.innerText = "CORRETO!";
    feedback.style.color = "var(--accent-green)";

    // Passar para a próxima pergunta ou abrir porta
    setTimeout(() => {
      gameState.currentQuestionIndex++;
      if (gameState.currentQuestionIndex < 3) {
        showQuestionInTerminal();
      } else {
        // Todas as 3 perguntas resolvidas! Destrava a porta
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

// Destravar Porta e Transicionar
function unlockDoor(sectorIdx) {
  const door = doorsList[sectorIdx];
  if (door.isUnlocked) return;

  door.isUnlocked = true;
  gameState.unlockedDoors[sectorIdx] = true;
  sounds.playDoorOpen();

  // Alterar neon da porta para Verde
  door.light.color.setHex(0x00ff88);

  const count = gameState.unlockedDoors.filter(Boolean).length;
  document.getElementById('doors-unlocked').innerText = `${count} / 5`;
  document.getElementById('current-sector').innerText = `${Math.min(5, sectorIdx + 2)} / 5`;

  // Animar abertura
  let progress = 0;
  const interval = setInterval(() => {
    progress += 0.05;
    door.left.position.x = -1.5 - progress * 1.5;
    door.right.position.x = 1.5 + progress * 1.5;
    if (progress >= 1) {
      clearInterval(interval);
    }
  }, 25);

  // Checar vitória
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
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
