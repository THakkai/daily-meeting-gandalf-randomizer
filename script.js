// ── State ──────────────────────────────────────────────────────────────────
const STORAGE_KEY_P = 'lotr_daily_participants_v2';
const STORAGE_KEY_L = 'lotr_daily_log';
const MAX_LOG_ENTRIES = 10;

const DEFAULT_PARTICIPANTS = [
  {name:'Arthur',  active:true},
  {name:'Nicolas', active:true},
  {name:'Philippe',active:true},
  {name:'Pierre',  active:true},
  {name:'Rachid',  active:true},
  {name:'Valentin',active:true},
];

let participants = JSON.parse(localStorage.getItem(STORAGE_KEY_P) || 'null') || DEFAULT_PARTICIPANTS.map(p=>({...p}));
let log = JSON.parse(localStorage.getItem(STORAGE_KEY_L) || '[]');
let pendingConfirmation = null; // Stores the name waiting for confirmation

// ── Persistence ────────────────────────────────────────────────────────────
function save() {
  localStorage.setItem(STORAGE_KEY_P, JSON.stringify(participants));
  localStorage.setItem(STORAGE_KEY_L, JSON.stringify(log));
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
  const pool = participants.filter(p => p.active);
  if (pool.length === 0) {
    document.getElementById('warningText').style.display = 'block';
    return;
  }
  document.getElementById('warningText').style.display = 'none';

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

  setTimeout(() => {
    clearInterval(interval);
    spinner.classList.remove('active');

    const chosen = pool[Math.floor(Math.random() * pool.length)].name;
    const quote  = QUOTES[Math.floor(Math.random() * QUOTES.length)];

    nameEl.style.opacity = '';
    nameEl.style.transform = '';
    nameEl.textContent = chosen;
    nameEl.classList.add('revealed','flash');
    subEl.textContent  = quote;
    subEl.classList.add('revealed');

    btn.disabled = false;
    pendingConfirmation = chosen;
    confirmBtn.style.display = 'block';
  }, 1400);
}

// ── Confirmation ───────────────────────────────────────────────────────────
function confirmSpeech() {
  if (!pendingConfirmation) return;

  const now = new Date();
  log.unshift({ name: pendingConfirmation, date: formatDate(now), time: formatTime(now) });

  // Limit log to 10 entries
  if (log.length > MAX_LOG_ENTRIES) {
    log = log.slice(0, MAX_LOG_ENTRIES);
  }

  // Deactivate the person who just spoke for the next draw
  const personIndex = participants.findIndex(p => p.name === pendingConfirmation);
  if (personIndex !== -1) {
    participants[personIndex].active = false;
  }

  save();
  renderLog();
  renderParticipants();

  document.getElementById('btnConfirm').style.display = 'none';
  pendingConfirmation = null;
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
  if (!confirm('Effacer tout le parchemin des désignés ?')) return;
  log = [];
  save();
  renderLog();
  renderParticipants(); // Update percentages
}

// ── Init ───────────────────────────────────────────────────────────────────
renderParticipants();
renderLog();
