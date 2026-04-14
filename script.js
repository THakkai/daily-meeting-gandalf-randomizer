// ── State ──────────────────────────────────────────────────────────────────
const STORAGE_KEY_P = 'lotr_daily_participants_v2';
const STORAGE_KEY_L = 'lotr_daily_log';
const MAX_LOG_ENTRIES = 100;
const mySessionId = Math.random().toString(36).substr(2, 9);

const DEFAULT_PARTICIPANTS = [
  {name:'Arthur',  active:true},
  {name:'Nicolas', active:true},
  {name:'Philippe',active:true},
  {name:'Pierre',  active:true},
  {name:'Rachid',  active:true},
  {name:'Valentin',active:true},
];

let participants = JSON.parse(localStorage.getItem(STORAGE_KEY_P) || 'null') || DEFAULT_PARTICIPANTS.map(p=>({...p}));
let log = []; // Will be loaded from Firebase
let pendingConfirmation = null; // Stores the name waiting for confirmation
let firebaseInitialized = false;
let lastDrawTimestamp = null; // Track the timestamp of the last draw we processed
let isUpdatingFromFirebase = false; // Flag to prevent circular updates

// ── Rate Limiting (Anti-bot protection) ────────────────────────────────────
const RATE_LIMITS = {
  DRAW_COOLDOWN: 5000,        // 5 seconds between draws
  CONFIRM_COOLDOWN: 2000,     // 2 seconds between confirmations
  CLEAR_LOG_COOLDOWN: 10000,  // 10 seconds between log clears
};

const rateLimitState = {
  lastDrawTime: 0,
  lastConfirmTime: 0,
  lastClearLogTime: 0,
};

function canPerformAction(actionType) {
  const now = Date.now();
  const lastTime = rateLimitState[`last${actionType}Time`] ?? 0;
  const cooldown = RATE_LIMITS[`${actionType.toUpperCase()}_COOLDOWN`] ?? 0;

  return (now - lastTime) >= cooldown;
}

function updateActionTime(actionType) {
  rateLimitState[`last${actionType}Time`] = Date.now();
}

function getRemainingCooldown(actionType) {
  const now = Date.now();
  const lastTime = rateLimitState[`last${actionType}Time`] ?? 0; // ← 0 par défaut si undefined
  const cooldown = RATE_LIMITS[`${actionType.toUpperCase()}_COOLDOWN`] ?? 0; // ← idem
  const remaining = cooldown - (now - lastTime);

  return Math.max(0, Math.ceil(remaining / 1000));
}

// ── Persistence ────────────────────────────────────────────────────────────
function save() {
  // Save participants to localStorage for offline access
  localStorage.setItem(STORAGE_KEY_P, JSON.stringify(participants));

  // Also save to Firebase if initialized
  if (firebaseInitialized && !isUpdatingFromFirebase) {
    saveParticipantsToFirebase(participants);
  }
  // Logs are now saved to Firebase, not localStorage
}

// ── Tabs ───────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  event.currentTarget.classList.add('active');
}

// ── Date formatting ────────────────────────────────────────────────────────
const DAYS_FR   = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function formatDate(d) {
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}
function formatTime(d) {
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
}

// ── Statistics ─────────────────────────────────────────────────────────────
function getDrawStats() {
  const stats = {};
  participants.forEach(p => {
    stats[p.name] = 0;
  });

  log.forEach(entry => {
    if (stats.hasOwnProperty(entry.name)) {
      stats[entry.name]++;
    }
  });

  return stats;
}

function getDrawPercentage(name) {
  if (log.length === 0) return 0;
  const stats = getDrawStats();
  const count = stats[name] || 0;
  return Math.round((count / log.length) * 100);
}

// ── Result display reset ───────────────────────────────────────────────────
function resetResultDisplay() {
  const nameEl = document.getElementById('resultName');
  const subEl = document.getElementById('resultSub');
  const confirmBtn = document.getElementById('btnConfirm');

  nameEl.classList.remove('revealed', 'flash');
  subEl.classList.remove('revealed');
  nameEl.textContent = '???';
  subEl.textContent = 'Que Gandalf guide votre chemin';
  if (confirmBtn) confirmBtn.style.display = 'none';
  pendingConfirmation = null;
  lastDrawTimestamp = null;
}

// ── Draw ───────────────────────────────────────────────────────────────────
const QUOTES = [
  'Portez ce fardeau avec honneur.',
  'Vous avez été choisi par le destin.',
  'Même les plus petits peuvent changer le cours des choses.',
  'Tous nous devons choisir : le bien ou le mal.',
  'Le courage n\'est pas l\'absence de peur.',
  'L\'heure n\'est pas au doute — parlez !',
  'Que votre présentation soit digne de la Communauté.'
];

function drawParticipant() {
  // Rate limiting check
  if (!canPerformAction('Draw')) {
    const remaining = getRemainingCooldown('Draw');
    alert(`Veuillez patienter ${remaining} seconde${remaining > 1 ? 's' : ''} avant de relancer le tirage.\n\nCette limite protège contre les abus.`);
    return;
  }

  const pool = participants.filter(p => p.active);
  if (pool.length === 0) {
    document.getElementById('warningText').style.display = 'block';
    return;
  }
  document.getElementById('warningText').style.display = 'none';

  // Update rate limit timestamp
  updateActionTime('Draw');

  const btn = document.getElementById('btnDraw');
  const nameEl = document.getElementById('resultName');
  const subEl = document.getElementById('resultSub');
  const spinner = document.getElementById('spinningRune');
  const confirmBtn = document.getElementById('btnConfirm');

  btn.disabled = true;
  nameEl.classList.remove('revealed','flash');
  subEl.classList.remove('revealed');
  nameEl.textContent = '';
  subEl.textContent = '';
  spinner.classList.add('active');
  confirmBtn.style.display = 'none';

  const RUNES = ['⚗','⚔','🌙','⭐','🔮','💎','🌿','⚙'];
  let count = 0;
  const interval = setInterval(() => {
    nameEl.textContent = pool[Math.floor(Math.random() * pool.length)].name;
    nameEl.style.opacity = '0.4';
    nameEl.style.transform = 'none';
    spinner.textContent = RUNES[count % RUNES.length];
    count++;
  }, 80);

  setTimeout(async () => {
    clearInterval(interval);
    spinner.classList.remove('active');

    const chosen = pool[Math.floor(Math.random() * pool.length)].name;
    const quote  = QUOTES[Math.floor(Math.random() * QUOTES.length)];

    // Show result locally first
    displayDrawResult(chosen, quote);

    btn.disabled = false;

    // Save to Firebase so all other users see it (sessionId prevents double-display)
    if (firebaseInitialized) {
      await saveCurrentDraw(chosen, quote, mySessionId);
    }
  }, 1400);
}

// Helper function to display draw result
function displayDrawResult(chosen, quote) {
  const nameEl = document.getElementById('resultName');
  const subEl = document.getElementById('resultSub');
  const confirmBtn = document.getElementById('btnConfirm');

  nameEl.style.opacity = '';
  nameEl.style.transform = '';
  nameEl.textContent = chosen;
  nameEl.classList.add('revealed','flash');
  subEl.textContent = quote;
  subEl.classList.add('revealed');

  pendingConfirmation = chosen;
  confirmBtn.style.display = 'block';
}

// Simulate roulette animation for remote users
function simulateRouletteAnimation(finalName, finalQuote) {
  const pool = participants.filter(p => p.active);
  if (pool.length === 0) return;

  const nameEl = document.getElementById('resultName');
  const subEl = document.getElementById('resultSub');
  const spinner = document.getElementById('spinningRune');
  const confirmBtn = document.getElementById('btnConfirm');

  // Reset display
  nameEl.classList.remove('revealed','flash');
  subEl.classList.remove('revealed');
  nameEl.textContent = '';
  subEl.textContent = '';
  spinner.classList.add('active');
  confirmBtn.style.display = 'none';

  const RUNES = ['⚗','⚔','🌙','⭐','🔮','💎','🌿','⚙'];
  let count = 0;
  const interval = setInterval(() => {
    nameEl.textContent = pool[Math.floor(Math.random() * pool.length)].name;
    nameEl.style.opacity = '0.4';
    nameEl.style.transform = 'none';
    spinner.textContent = RUNES[count % RUNES.length];
    count++;
  }, 80);

  setTimeout(() => {
    clearInterval(interval);
    spinner.classList.remove('active');
    displayDrawResult(finalName, finalQuote);
  }, 1400);
}

// ── Confirmation ───────────────────────────────────────────────────────────
async function confirmSpeech() {
  if (!pendingConfirmation) return;

  // Rate limiting check
  if (!canPerformAction('Confirm')) {
    const remaining = getRemainingCooldown('Confirm');
    alert(`Veuillez patienter ${remaining} seconde${remaining > 1 ? 's' : ''} avant de confirmer à nouveau.\n\nCette limite protège contre les abus.`);
    return;
  }

  // Update rate limit timestamp
  updateActionTime('Confirm');

  const now = new Date();
  const newEntry = { name: pendingConfirmation, date: formatDate(now), time: formatTime(now) };

  // Add to local log array first for immediate UI update
  log.unshift(newEntry);

  // Limit log to 10 entries
  //if (log.length > MAX_LOG_ENTRIES) {
  //  log = log.slice(0, MAX_LOG_ENTRIES);
  //}

  // Deactivate the person who just spoke for the next draw
  //const personIndex = participants.findIndex(p => p.name === pendingConfirmation);
  //if (personIndex !== -1) {
  //  participants[personIndex].active = false;
  //}

  save();
  renderLog();
  renderParticipants();

  // Save to Firebase
  if (firebaseInitialized) {
    await saveLogToFirebase(newEntry);
    // Clear the current draw state after confirmation
    await clearCurrentDraw();
  }

  // Reset the result display for the confirming user
  resetResultDisplay();
}

// ── Participants ───────────────────────────────────────────────────────────
function renderParticipants() {
  const grid = document.getElementById('participantsGrid');
  const activeCount = participants.filter(p => p.active).length;
  const stats = getDrawStats();

  document.getElementById('countLabel').textContent = participants.length;
  document.getElementById('activeCountLabel').textContent =
    participants.length ? `— ${activeCount} dans le tirage` : '';

  grid.innerHTML = participants.map((p, i) => {
    const percentage = getDrawPercentage(p.name);
    const statsText = log.length > 0 ? ` (${percentage}%)` : '';

    return `
      <div class="participant-chip ${p.active ? 'is-active' : 'is-inactive'}"
           onclick="toggleParticipant(${i})" title="${p.active ? 'Exclure du tirage' : 'Inclure dans le tirage'}">
        <span class="chip-name">${p.name}${statsText}</span>
        <button class="chip-toggle" onclick="event.stopPropagation(); toggleParticipant(${i})"
                title="${p.active ? 'Désactiver' : 'Activer'}">
          ${p.active ? '🕯' : '💀'}
        </button>
        <button class="chip-delete" onclick="event.stopPropagation(); removeParticipant(${i})"
                title="Retirer définitivement ${p.name}">×</button>
      </div>
    `;
  }).join('');
}

function toggleParticipant(i) {
  participants[i].active = !participants[i].active;
  save();
  renderParticipants();
}

function addParticipant() {
  const input = document.getElementById('newNameInput');
  const name  = input.value.trim();
  if (!name) return;
  if (participants.some(p => p.name === name)) { input.value = ''; return; }
  participants.push({ name, active: true });
  input.value = '';
  save();
  renderParticipants();
}

function removeParticipant(i) {
  participants.splice(i, 1);
  save();
  renderParticipants();
}

// ── Log ────────────────────────────────────────────────────────────────────
function renderLog() {
  const list = document.getElementById('logList');
  if (log.length === 0) {
    list.innerHTML = '<div class="empty-log">Aucun tirage n\'a encore eu lieu.<br><em>Que l\'aventure commence…</em></div>';
    return;
  }

  const stats = getDrawStats();

  list.innerHTML = log.map((entry, i) => {
    const percentage = getDrawPercentage(entry.name);
    return `
      <div class="log-entry">
        <span class="log-index">${log.length - i}</span>
        <span class="log-name">⚔ ${entry.name} <span class="log-stats">${percentage}%</span></span>
        <span class="log-datetime">
          <span class="log-date">${entry.date}</span>
          <span class="log-time">${entry.time}</span>
        </span>
      </div>
    `;
  }).join('');
}

function clearLog() {
  // Rate limiting check
  if (!canPerformAction('ClearLog')) {
    const remaining = getRemainingCooldown('ClearLog');
    alert(`Veuillez patienter ${remaining} seconde${remaining > 1 ? 's' : ''} avant d'effacer à nouveau le parchemin.\n\nCette limite protège contre les abus.`);
    return;
  }

  if (!confirm('Effacer tout le parchemin des désignés ?')) return;

  // Update rate limit timestamp
  updateActionTime('ClearLog');

  log = [];
  save();
  renderLog();
  renderParticipants(); // Update percentages

  // Clear from Firebase
  if (firebaseInitialized) {
    clearLogsFromFirebase();
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
async function initApp() {
  // Initialize Firebase
  firebaseInitialized = initFirebase();

  if (firebaseInitialized) {
    // Load participants from Firebase
    const firebaseParticipants = await loadParticipantsFromFirebase();
    if (firebaseParticipants.length > 0) {
      participants = firebaseParticipants;
    } else {
      // If no participants in Firebase, save local ones
      await saveParticipantsToFirebase(participants);
    }

    // Subscribe to real-time updates on participants
    subscribeToParticipants((updatedParticipants) => {
      // Only update if the change came from another user
      if (JSON.stringify(updatedParticipants) !== JSON.stringify(participants)) {
        isUpdatingFromFirebase = true;
        participants = updatedParticipants;
        localStorage.setItem(STORAGE_KEY_P, JSON.stringify(participants));
        renderParticipants();
        isUpdatingFromFirebase = false;
      }
    });

    // Load logs from Firebase
    log = await loadLogsFromFirebase();

    // Subscribe to real-time updates on logs
    subscribeToLogs((updatedLogs) => {
      log = updatedLogs;
      renderLog();
      renderParticipants(); // Update percentages
    });

    // Subscribe to real-time updates on current draw state
    subscribeToCurrentDraw((drawState) => {
      if (drawState && drawState.timestamp) {
        // Get timestamp value (handle Firestore Timestamp object)
        const drawTimestamp = drawState.timestamp?.toMillis ? drawState.timestamp.toMillis() : drawState.timestamp;

        // Only process if this is a new draw we haven't seen before
        if (lastDrawTimestamp === null || drawTimestamp !== lastDrawTimestamp) {
          lastDrawTimestamp = drawTimestamp;

          // Show the draw only if it was initiated by another session
          if (drawState.sessionId !== mySessionId) {
            // Trigger animation for remote users instead of directly showing result
            simulateRouletteAnimation(drawState.name, drawState.quote);
          }
        }
      } else if (drawState === null) {
        // Draw was confirmed or cleared — reset the display for all users
        resetResultDisplay();
      }
    });
  } else {
    console.warn('Firebase not initialized. Using empty log.');
  }

  // Render initial UI
  renderParticipants();
  renderLog();
}

// Start the application
initApp();
