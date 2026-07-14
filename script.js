/* ================================================================
   CampusOS v2.0 – AI-Powered Student Productivity Platform
   script.js  |  Complete Application Logic
   ================================================================ */

'use strict';

// ── Utilities ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const uid = () => 'u_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const today = () => new Date().toISOString().split('T')[0];
const fmt = (date) => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const daysFromNow = (date) => Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));

// ── Storage Helpers ──────────────────────────────────────────────
const Store = {
  get: (key, def = null) => {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  del: (key) => localStorage.removeItem(key),
  userKey: (key) => `campusOS_${Auth.currentUid()}_${key}`
};

// User-scoped storage
const UStore = {
  get: (key, def = null) => Store.get(Store.userKey(key), def),
  set: (key, val) => Store.set(Store.userKey(key), val),
  del: (key) => Store.del(Store.userKey(key)),
};

// ═══════════════════════════════════════════════════
// AUTHENTICATION SYSTEM
// ═══════════════════════════════════════════════════
const Auth = {
  currentUid: () => Store.get('campusOS_currentUser'),

  getUsers: () => Store.get('campusOS_users', []),

  saveUsers: (users) => Store.set('campusOS_users', users),

  findUser: (email) => Auth.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()),

  login(uid, remember) {
    Store.set('campusOS_currentUser', uid);
    if (!remember) sessionStorage.setItem('campusOS_session', uid);
  },

  logout() {
    Store.del('campusOS_currentUser');
    sessionStorage.removeItem('campusOS_session');
    location.reload();
  },

  register(name, username, email, password, college) {
    const users = Auth.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, err: 'Email already registered.' };
    const newUser = { uid: uid(), name, username: username || name.split(' ')[0].toLowerCase(), email, password, college, createdAt: Date.now() };
    users.push(newUser);
    Auth.saveUsers(users);
    return { ok: true, user: newUser };
  },

  isLoggedIn: () => !!Store.get('campusOS_currentUser'),

  currentUser() {
    const cuid = Auth.currentUid();
    if (!cuid) return null;
    return Auth.getUsers().find(u => u.uid === cuid) || null;
  }
};

// Auth UI
function showAuth(screen) {
  ['login', 'signup', 'forgot'].forEach(s => {
    $('auth-' + s)?.classList.add('hidden');
  });
  const el = $('auth-' + screen);
  if (el) { el.classList.remove('hidden'); el.classList.add('auth-card-enter'); }
}

function togglePwd(inputId, btn) {
  const inp = $(inputId);
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

function doLogin() {
  const email = $('login-email')?.value.trim();
  const pass = $('login-password')?.value;
  const remember = $('login-remember')?.checked;
  if (!email || !pass) return showToast('Please fill in all fields.', 'error');
  const user = Auth.findUser(email);
  if (!user) return showToast('No account found with this email.', 'error');
  if (user.password !== pass) return showToast('Incorrect password.', 'error');
  Auth.login(user.uid, remember);
  launchApp();
}

function doSignup() {
  const name = $('signup-name')?.value.trim();
  const username = $('signup-username')?.value.trim();
  const email = $('signup-email')?.value.trim();
  const pass = $('signup-password')?.value;
  const college = $('signup-college')?.value.trim();
  if (!name || !email || !pass) return showToast('Please fill in required fields.', 'error');
  if (pass.length < 6) return showToast('Password must be at least 6 characters.', 'error');
  const res = Auth.register(name, username, email, pass, college);
  if (!res.ok) return showToast(res.err, 'error');
  // Auto-save initial profile
  UStore.set = (key, val) => Store.set(`campusOS_${res.user.uid}_${key}`, val);
  Store.set(`campusOS_${res.user.uid}_profile`, { name, username: username || name.split(' ')[0].toLowerCase(), email, college, bio: '', branch: '', year: '', skills: '', github: '', linkedin: '', portfolio: '', avatar: '' });
  Auth.login(res.user.uid, true);
  launchApp();
}

function doForgot() {
  const email = $('forgot-email')?.value.trim();
  if (!email) return showToast('Please enter your email.', 'error');
  const user = Auth.findUser(email);
  if (!user) return showToast('No account found with this email.', 'error');
  // Simulate reset — show password
  showToast(`Your password is: ${user.password}`, 'info', 6000);
  setTimeout(() => showAuth('login'), 4000);
}

function googleSignIn() {
  const mockName = prompt('Enter your name for Google Sign-In (demo):') || 'Google User';
  const mockEmail = `${mockName.toLowerCase().replace(/\s+/g,'.')}@gmail.com`;
  let user = Auth.findUser(mockEmail);
  if (!user) {
    const res = Auth.register(mockName, mockName.split(' ')[0].toLowerCase(), mockEmail, 'google_oauth_' + uid(), '');
    user = res.user;
    Store.set(`campusOS_${user.uid}_profile`, { name: mockName, username: mockName.split(' ')[0].toLowerCase(), email: mockEmail, college: '', bio: '', branch: '', year: '', skills: '', github: '', linkedin: '', portfolio: '', avatar: '' });
  }
  Auth.login(user.uid, true);
  launchApp();
}

function doLogout() {
  if (confirm('Are you sure you want to sign out?')) Auth.logout();
}

// ═══════════════════════════════════════════════════
// APP BOOTSTRAP
// ═══════════════════════════════════════════════════
function launchApp() {
  $('auth-overlay')?.classList.add('hidden');
  const app = $('app-wrapper');
  if (app) { app.classList.remove('hidden'); app.classList.add('app-fade-in'); }
  initApp();
}

function initApp() {
  updateDateDisplay();
  loadSettings();
  loadUserDisplay();
  loadProfile();
  updateDashboard();
  renderTrackerSubjects();
  renderResources();
  renderAssignments();
  renderExpenses();
  renderCodingStats();
  generateNotifications();
  setGreeting();
  setInterval(updateDateDisplay, 60000);
  setInterval(generateNotifications, 300000);
}

window.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) {
    launchApp();
  } else {
    $('auth-overlay')?.classList.remove('hidden');
    $('app-wrapper')?.classList.add('hidden');
  }
});

// ── Date & Greeting ─────────────────────────────────────────────
function updateDateDisplay() {
  const now = new Date();
  const el = $('current-date');
  if (el) el.textContent = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function setGreeting() {
  const hour = new Date().getHours();
  let greeting = hour < 12 ? 'Good morning! ☀️' : hour < 17 ? 'Good afternoon! 🌤️' : 'Good evening! 🌙';
  const el = $('wb-greeting');
  if (el) el.textContent = greeting;
}

// ── User Display ─────────────────────────────────────────────────
function loadUserDisplay() {
  const profile = UStore.get('profile', {});
  const user = Auth.currentUser();
  const name = profile.name || user?.name || 'Student';
  const email = user?.email || '';
  const avatar = profile.avatar || '';

  // Welcome banner
  const title = $('wb-title');
  if (title) title.textContent = `Welcome back, ${name.split(' ')[0]} 👋`;

  // Sidebar user card
  const suName = $('su-name'); if (suName) suName.textContent = name;
  const suEmail = $('su-email'); if (suEmail) suEmail.textContent = email;
  const suAvatar = $('su-avatar');
  if (suAvatar) {
    if (avatar) { suAvatar.style.backgroundImage = `url(${avatar})`; suAvatar.style.backgroundSize = 'cover'; suAvatar.textContent = ''; }
    else suAvatar.textContent = name.charAt(0).toUpperCase() || '👤';
  }

  // Header pill
  const hupName = $('hup-name'); if (hupName) hupName.textContent = name.split(' ')[0];
  const hupAvatar = $('hup-avatar');
  if (hupAvatar) {
    if (avatar) { hupAvatar.style.backgroundImage = `url(${avatar})`; hupAvatar.style.backgroundSize = 'cover'; hupAvatar.textContent = ''; }
    else hupAvatar.textContent = name.charAt(0).toUpperCase() || '👤';
  }
}

// ═══════════════════════════════════════════════════
// MODULE NAVIGATION
// ═══════════════════════════════════════════════════
function showModule(mod) {
  document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const section = $('module-' + mod);
  if (section) section.classList.add('active');
  const navBtn = $('nav-' + mod);
  if (navBtn) navBtn.classList.add('active');
  // Close mobile sidebar
  document.getElementById('sidebar')?.classList.remove('open');
  $('sidebar-overlay')?.classList.remove('active');
  // Refresh specific modules
  if (mod === 'dashboard') updateDashboard();
  if (mod === 'attn-dashboard') refreshAttnDashboard();
  if (mod === 'notifications') generateNotifications();
  if (mod === 'coding') renderCodingStats();
}

function toggleSidebar() {
  const sb = $('sidebar');
  const overlay = $('sidebar-overlay');
  sb?.classList.toggle('open');
  overlay?.classList.toggle('active');
}

// ═══════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════
let toastTimer;
function showToast(msg, type = 'success', duration = 3000) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show toast-${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, duration);
}

// ═══════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════
function updateDashboard() {
  updateDashStats();
  renderDashAttendance();
  renderDashResources();
  renderDashAssignments();
  renderDashExpenses();
}

function updateDashStats() {
  // CGPA
  const cgpa = UStore.get('lastCGPA');
  if (cgpa) {
    const el = $('stat-cgpa'); if (el) el.textContent = cgpa;
    const delta = $('stat-cgpa-delta'); if (delta) { delta.textContent = 'Calculated'; delta.className = 'stat-delta pos'; }
    const chip = $('chip-cgpa'); if (chip) chip.textContent = `🎓 CGPA: ${cgpa}`;
    animateRing('sr-cgpa', (parseFloat(cgpa) / 10) * 100);
  }

  // Attendance
  const subjects = UStore.get('trackerSubjects', []);
  if (subjects.length > 0) {
    const totalA = subjects.reduce((s, sub) => s + sub.attended, 0);
    const totalC = subjects.reduce((s, sub) => s + sub.total, 0);
    if (totalC > 0) {
      const pct = Math.round((totalA / totalC) * 100);
      const el = $('stat-attendance'); if (el) el.textContent = pct + '%';
      const delta = $('stat-attn-delta'); if (delta) { delta.textContent = pct >= 75 ? '✅ Safe' : '⚠️ Low'; delta.className = `stat-delta ${pct >= 75 ? 'pos' : 'neg'}`; }
      const chip = $('chip-attn'); if (chip) chip.textContent = `📅 Attendance: ${pct}%`;
      animateRing('sr-attn', pct);
    }
  }

  // Assignments
  const assignments = UStore.get('assignments', []);
  const pending = assignments.filter(a => a.status !== 'done');
  const el = $('stat-assignments'); if (el) el.textContent = pending.length;
  const chip = $('chip-assign'); if (chip) chip.textContent = `✅ Pending: ${pending.length}`;
  const badge = $('nav-badge-assignments');
  if (badge) { if (pending.length > 0) { badge.style.display = 'flex'; badge.textContent = pending.length; } else badge.style.display = 'none'; }
  const delta = $('stat-assign-delta'); if (delta) { delta.textContent = pending.length === 0 ? 'All clear ✨' : `${pending.length} task${pending.length > 1 ? 's' : ''}`; delta.className = `stat-delta ${pending.length === 0 ? 'pos' : 'neg'}`; }

  // Resources
  const resources = UStore.get('resources', []);
  const resEl = $('stat-resources'); if (resEl) resEl.textContent = resources.length;
  const resChip = $('chip-res'); if (resChip) resChip.textContent = `🔗 Resources: ${resources.length}`;
  const resDelta = $('stat-res-delta'); if (resDelta) resDelta.textContent = resources.length === 0 ? 'None saved' : `${resources.length} saved`;

  // Coding streak
  const codingStats = UStore.get('codingStats', {});
  const streakEl = $('stat-coding-streak'); if (streakEl) streakEl.textContent = codingStats.streak || 0;

  // Expenses
  const expenses = UStore.get('expenses', []);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = expenses.filter(e => (e.date || '').startsWith(thisMonth)).reduce((s, e) => s + (e.amount || 0), 0);
  const expEl = $('stat-expense'); if (expEl) expEl.textContent = '₹' + Math.round(monthTotal).toLocaleString('en-IN');
}

function animateRing(ringId, pct) {
  const ring = $(ringId);
  if (!ring) return;
  const circumference = 2 * Math.PI * 22;
  const dash = (pct / 100) * circumference;
  ring.style.transition = 'stroke-dasharray 1s ease';
  ring.setAttribute('stroke-dasharray', `${dash} ${circumference}`);
}

function renderDashAttendance() {
  const container = $('dash-attendance-list');
  if (!container) return;
  const subjects = UStore.get('trackerSubjects', []);
  if (subjects.length === 0) { container.innerHTML = `<p class="empty-msg"><span class="empty-icon">📅</span>No subjects tracked yet.<br><button class="link-btn" onclick="showModule('attendance')">Add subjects →</button></p>`; return; }
  container.innerHTML = subjects.slice(0, 4).map(sub => {
    const pct = sub.total > 0 ? Math.round((sub.attended / sub.total) * 100) : 0;
    const color = pct >= 85 ? 'var(--green)' : pct >= 75 ? 'var(--amber)' : 'var(--red)';
    return `<div class="dash-item"><span class="dash-item-name">${sub.name}</span><div class="dash-mini-bar"><div class="dash-mini-fill" style="width:${pct}%;background:${color}"></div></div><span class="dash-item-val" style="color:${color}">${pct}%</span></div>`;
  }).join('');
}

function renderDashResources() {
  const container = $('dash-resources-list');
  if (!container) return;
  const resources = UStore.get('resources', []);
  if (resources.length === 0) { container.innerHTML = `<p class="empty-msg"><span class="empty-icon">🔗</span>No resources saved yet.<br><button class="link-btn" onclick="showModule('resources')">Add resources →</button></p>`; return; }
  const catIcons = { LinkedIn: '💼', GitHub: '🐱', LeetCode: '💻', Notes: '📝', PDFs: '📄', YouTube: '▶️', PYQ: '📋', Website: '🌐', Custom: '⭐' };
  container.innerHTML = resources.slice(-4).reverse().map(r => `<div class="dash-item"><span class="dash-item-icon">${catIcons[r.category] || '🔗'}</span><span class="dash-item-name" title="${r.title}">${r.title}</span><a href="${r.url}" target="_blank" class="link-btn" style="font-size:0.75rem">Open →</a></div>`).join('');
}

function renderDashAssignments() {
  const container = $('dash-assignments-list');
  if (!container) return;
  const assignments = UStore.get('assignments', []);
  const pending = assignments.filter(a => a.status !== 'done').sort((a, b) => new Date(a.due) - new Date(b.due));
  if (pending.length === 0) { container.innerHTML = `<p class="empty-msg"><span class="empty-icon">✅</span>No pending assignments!<br><button class="link-btn" onclick="showModule('assignments')">Add assignment →</button></p>`; return; }
  const prioColors = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--green)' };
  container.innerHTML = pending.slice(0, 4).map(a => {
    const days = daysFromNow(a.due);
    return `<div class="dash-item"><span class="dash-item-dot" style="background:${prioColors[a.priority] || 'var(--blue-500)'}"></span><span class="dash-item-name">${a.title}</span><span class="dash-item-val" style="color:${days <= 2 ? 'var(--red)' : 'var(--text-muted)'};font-size:0.75rem">${days < 0 ? 'Overdue' : days === 0 ? 'Today' : `${days}d`}</span></div>`;
  }).join('');
}

function renderDashExpenses() {
  const container = $('dash-expenses-list');
  if (!container) return;
  const expenses = UStore.get('expenses', []);
  if (expenses.length === 0) { container.innerHTML = `<p class="empty-msg"><span class="empty-icon">💰</span>No expenses recorded.<br><button class="link-btn" onclick="showModule('expenses')">Track expenses →</button></p>`; return; }
  const catIcons = { Food: '🍔', Transport: '🚗', Books: '📚', Entertainment: '🎮', Health: '💊', Clothing: '👕', Other: '📦' };
  container.innerHTML = expenses.slice(-4).reverse().map(e => `<div class="dash-item"><span class="dash-item-icon">${catIcons[e.category] || '📦'}</span><span class="dash-item-name">${e.title}</span><span class="dash-item-val">₹${e.amount}</span></div>`).join('');
}

// ═══════════════════════════════════════════════════
// ACADEMIC HUB
// ═══════════════════════════════════════════════════
function showAcadTab(tab, btn) {
  document.querySelectorAll('#module-academics .tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#module-academics .tab-btn').forEach(b => b.classList.remove('active'));
  $('tab-' + tab)?.classList.add('active');
  btn?.classList.add('active');
}

function addPercentSubject() {
  const container = $('percent-subjects');
  const idx = container.children.length;
  const row = document.createElement('div');
  row.className = 'subject-row'; row.dataset.index = idx;
  row.innerHTML = `<input type="text" placeholder="Subject Name" class="sub-name"/><input type="number" placeholder="Marks Obtained" class="sub-obtained" min="0" oninput="calcPercentage()"/><input type="number" placeholder="Maximum Marks" class="sub-max" min="1" oninput="calcPercentage()"/><button class="remove-btn" onclick="removeSubjectRow(this,'percent-subjects',calcPercentage)" title="Remove">✕</button>`;
  container.appendChild(row);
}

function calcPercentage() {
  const rows = document.querySelectorAll('#percent-subjects .subject-row');
  let totalObtained = 0, totalMax = 0;
  rows.forEach(row => {
    const ob = parseFloat(row.querySelector('.sub-obtained')?.value) || 0;
    const mx = parseFloat(row.querySelector('.sub-max')?.value) || 0;
    totalObtained += ob; totalMax += mx;
  });
  const resultEl = $('percent-result');
  if (!resultEl) return;
  if (totalMax === 0) { resultEl.classList.add('hidden'); return; }
  const pct = ((totalObtained / totalMax) * 100).toFixed(2);
  const grade = pct >= 90 ? 'Outstanding' : pct >= 80 ? 'Excellent' : pct >= 70 ? 'Good' : pct >= 60 ? 'Average' : 'Needs Improvement';
  resultEl.innerHTML = `<div class="result-big">${pct}%</div><div class="result-sub">${grade} · ${totalObtained} / ${totalMax}</div>`;
  resultEl.classList.remove('hidden');
}

function addSGPASubject() {
  const container = $('sgpa-subjects');
  const idx = container.children.length;
  const row = document.createElement('div');
  row.className = 'subject-row'; row.dataset.index = idx;
  row.innerHTML = `<input type="text" placeholder="Subject name" class="sub-name"/><input type="number" placeholder="3" class="sub-credits" min="1" max="6" oninput="calcSGPA()"/><input type="number" placeholder="8.5" class="sub-grade" min="0" max="10" step="0.01" oninput="calcSGPA()"/><button class="remove-btn" onclick="removeSubjectRow(this,'sgpa-subjects',calcSGPA)" title="Remove">✕</button>`;
  container.appendChild(row);
}

function calcSGPA() {
  const rows = document.querySelectorAll('#sgpa-subjects .subject-row');
  let totalCredits = 0, weightedSum = 0;
  rows.forEach(row => {
    const cr = parseFloat(row.querySelector('.sub-credits')?.value) || 0;
    const gp = parseFloat(row.querySelector('.sub-grade')?.value) || 0;
    totalCredits += cr; weightedSum += cr * gp;
  });
  const resultEl = $('sgpa-result');
  if (!resultEl) return;
  if (totalCredits === 0) { resultEl.classList.add('hidden'); return; }
  const sgpa = (weightedSum / totalCredits).toFixed(2);
  resultEl.innerHTML = `<div class="result-big">${sgpa} / 10</div><div class="result-sub">SGPA · ${totalCredits} Total Credits</div>`;
  resultEl.classList.remove('hidden');
  UStore.set('lastCGPA', sgpa);
  updateDashStats();
}

function addCGPASemester() {
  const container = $('cgpa-semesters');
  const idx = container.children.length;
  const row = document.createElement('div');
  row.className = 'subject-row'; row.dataset.index = idx;
  row.innerHTML = `<input type="text" placeholder="Semester ${idx + 1}" class="sub-name"/><input type="number" placeholder="8.0" class="sub-sgpa" min="0" max="10" step="0.01" oninput="calcCGPA()"/><button class="remove-btn" onclick="removeSubjectRow(this,'cgpa-semesters',calcCGPA)" title="Remove">✕</button>`;
  container.appendChild(row);
}

function calcCGPA() {
  const rows = document.querySelectorAll('#cgpa-semesters .subject-row');
  let total = 0, count = 0;
  rows.forEach(row => {
    const sg = parseFloat(row.querySelector('.sub-sgpa')?.value) || 0;
    if (sg > 0) { total += sg; count++; }
  });
  const resultEl = $('cgpa-result');
  if (!resultEl) return;
  if (count === 0) { resultEl.classList.add('hidden'); return; }
  const cgpa = (total / count).toFixed(2);
  resultEl.innerHTML = `<div class="result-big">${cgpa} / 10</div><div class="result-sub">CGPA · ${count} Semester${count > 1 ? 's' : ''}</div>`;
  resultEl.classList.remove('hidden');
  UStore.set('lastCGPA', cgpa);
  updateDashStats();
}

function calcTargetCGPA() {
  const curr = parseFloat($('t-current-cgpa')?.value);
  const done = parseInt($('t-completed-sems')?.value);
  const target = parseFloat($('t-target-cgpa')?.value);
  const total = parseInt($('t-total-sems')?.value);
  const resultEl = $('target-result');
  if (!resultEl) return;
  if (!curr || !done || !target || !total || done >= total) {
    resultEl.innerHTML = '<div class="result-sub">Please fill all fields correctly. Remaining semesters must be > 0.</div>';
    resultEl.classList.remove('hidden'); return;
  }
  const remaining = total - done;
  const requiredSGPA = ((target * total) - (curr * done)) / remaining;
  if (requiredSGPA > 10) {
    resultEl.innerHTML = `<div class="result-big" style="color:var(--red)">Not Achievable</div><div class="result-sub">Required SGPA (${requiredSGPA.toFixed(2)}) exceeds 10.0</div>`;
  } else if (requiredSGPA < 0) {
    resultEl.innerHTML = `<div class="result-big" style="color:var(--green)">Already Achieved! 🎉</div><div class="result-sub">Your current CGPA exceeds your target.</div>`;
  } else {
    resultEl.innerHTML = `<div class="result-big">${requiredSGPA.toFixed(2)}</div><div class="result-sub">Required SGPA per semester for next ${remaining} semester${remaining > 1 ? 's' : ''} to reach CGPA ${target}</div>`;
  }
  resultEl.classList.remove('hidden');
}

function removeSubjectRow(btn, containerId, callback) {
  const row = btn.closest('.subject-row, .resume-entry');
  if (row && document.getElementById(containerId)?.children.length > 1) {
    row.remove();
    if (typeof callback === 'function') callback();
  } else { showToast('Keep at least one row.', 'info'); }
}

// ═══════════════════════════════════════════════════
// ATTENDANCE HUB
// ═══════════════════════════════════════════════════
function showAttendTab(tab, btn) {
  document.querySelectorAll('.attend-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#module-attendance .tab-btn').forEach(b => b.classList.remove('active'));
  $('attend-tab-' + tab)?.classList.add('active');
  btn?.classList.add('active');
  if (tab === 'attn-dashboard') refreshAttnDashboard();
}

function calcAttendance() {
  const attended = parseInt($('ac-attended')?.value) || 0;
  const total = parseInt($('ac-total')?.value) || 0;
  const required = parseInt($('ac-required')?.value) || 75;
  const resultEl = $('ac-result');
  if (!resultEl || total === 0) { resultEl?.classList.add('hidden'); return; }
  const pct = ((attended / total) * 100).toFixed(1);
  const color = pct >= required ? 'var(--green)' : 'var(--red)';
  let canSkip = 0, needAttend = 0;
  if (pct >= required) {
    canSkip = Math.floor((attended - (required / 100) * total) / (required / 100));
  } else {
    needAttend = Math.ceil(((required / 100) * total - attended) / (1 - required / 100));
  }
  const status = pct >= required ? `✅ Safe! You can skip up to <strong>${canSkip}</strong> more class${canSkip !== 1 ? 'es' : ''}` : `⚠️ Need to attend <strong>${needAttend}</strong> more class${needAttend !== 1 ? 'es' : ''} to reach ${required}%`;
  resultEl.innerHTML = `<div class="result-big" style="color:${color}">${pct}%</div><div class="result-sub">${attended} attended out of ${total} classes</div><div style="margin-top:10px;font-size:0.9rem">${status}</div>`;
  resultEl.classList.remove('hidden');
}

function addTrackerSubject() {
  const input = $('new-subject-name');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return showToast('Enter a subject name.', 'error');
  const subjects = UStore.get('trackerSubjects', []);
  if (subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) return showToast('Subject already exists.', 'error');
  subjects.push({ id: uid(), name, attended: 0, total: 0 });
  UStore.set('trackerSubjects', subjects);
  input.value = '';
  renderTrackerSubjects();
  showToast(`${name} added!`, 'success');
}

function renderTrackerSubjects() {
  const container = $('tracker-subjects-list');
  const empty = $('tracker-empty');
  const badge = $('subjects-count-badge');
  if (!container) return;
  const subjects = UStore.get('trackerSubjects', []);
  if (subjects.length === 0) { if (empty) empty.style.display = ''; if (badge) badge.style.display = 'none'; return; }
  if (empty) empty.style.display = 'none';
  if (badge) { badge.style.display = ''; badge.textContent = `${subjects.length} Subject${subjects.length > 1 ? 's' : ''}`; }
  container.innerHTML = subjects.map(sub => {
    const pct = sub.total > 0 ? Math.round((sub.attended / sub.total) * 100) : 0;
    const color = pct >= 85 ? '#10b981' : pct >= 75 ? '#f59e0b' : pct > 0 ? '#ef4444' : '#94a3b8';
    return `<div class="tracker-subject-card" id="subcard-${sub.id}">
      <div class="tsc-header">
        <div class="tsc-name">${sub.name}</div>
        <div class="tsc-pct" style="color:${color}">${sub.total > 0 ? pct + '%' : '—'}</div>
        <button class="remove-btn" onclick="deleteTrackerSubject('${sub.id}')" title="Delete subject">🗑️</button>
      </div>
      <div class="tsc-bar-wrap"><div class="tsc-bar"><div class="tsc-fill" style="width:${pct}%;background:${color}"></div></div></div>
      <div class="tsc-stats">${sub.attended} / ${sub.total} classes attended</div>
      <div class="tsc-actions">
        <button class="btn btn-sm btn-green" onclick="markAttendance('${sub.id}','present')">✅ Present</button>
        <button class="btn btn-sm btn-red" onclick="markAttendance('${sub.id}','absent')">❌ Absent</button>
        <button class="btn btn-sm btn-outline" onclick="markAttendance('${sub.id}','cancel')">⏭ Cancelled</button>
      </div>
    </div>`;
  }).join('');
  updateDashboard();
}

function markAttendance(subId, status) {
  const subjects = UStore.get('trackerSubjects', []);
  const sub = subjects.find(s => s.id === subId);
  if (!sub) return;
  if (status === 'present') { sub.attended++; sub.total++; }
  else if (status === 'absent') { sub.total++; }
  // 'cancel' does nothing to counts
  UStore.set('trackerSubjects', subjects);
  // Log history
  const history = UStore.get('attendanceHistory', []);
  history.push({ subId, subName: sub.name, status, date: new Date().toISOString() });
  UStore.set('attendanceHistory', history);
  renderTrackerSubjects();
  refreshAttnDashboard();
  const msg = status === 'present' ? '✅ Marked Present' : status === 'absent' ? '❌ Marked Absent' : '⏭ Class Cancelled';
  showToast(msg, status === 'present' ? 'success' : 'info');
}

function deleteTrackerSubject(subId) {
  if (!confirm('Delete this subject and all its data?')) return;
  const subjects = UStore.get('trackerSubjects', []).filter(s => s.id !== subId);
  UStore.set('trackerSubjects', subjects);
  renderTrackerSubjects();
  showToast('Subject removed.', 'info');
}

function refreshAttnDashboard() {
  const subjects = UStore.get('trackerSubjects', []);
  const totalA = subjects.reduce((s, sub) => s + sub.attended, 0);
  const totalC = subjects.reduce((s, sub) => s + sub.total, 0);
  const pct = totalC > 0 ? Math.round((totalA / totalC) * 100) : 0;

  const pctEl = $('oa-percent'); if (pctEl) pctEl.textContent = totalC > 0 ? pct + '%' : '—';
  const summaryEl = $('oa-summary');
  if (summaryEl) summaryEl.textContent = totalC > 0 ? `${totalA} attended out of ${totalC} classes across ${subjects.length} subjects` : 'No subjects tracked yet.';

  // Animate ring
  const ring = $('oa-ring-fill');
  if (ring) {
    const circumference = 2 * Math.PI * 36;
    ring.style.stroke = pct >= 85 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';
    ring.style.transition = 'stroke-dasharray 1s ease';
    ring.setAttribute('stroke-dasharray', `${(pct / 100) * circumference} ${circumference}`);
  }

  // Subject bars
  const barsEl = $('subject-attn-bars');
  if (barsEl) {
    barsEl.innerHTML = subjects.map(sub => {
      const sp = sub.total > 0 ? Math.round((sub.attended / sub.total) * 100) : 0;
      const color = sp >= 85 ? '#10b981' : sp >= 75 ? '#f59e0b' : '#ef4444';
      return `<div class="subj-bar-row"><span class="sbr-name">${sub.name}</span><div class="sbr-bar"><div class="sbr-fill" style="width:${sp}%;background:${color}"></div></div><span class="sbr-pct" style="color:${color}">${sp}%</span></div>`;
    }).join('') || '<p class="empty-msg">No subjects tracked yet.</p>';
  }
}

function renderAttendanceHistory() {
  const container = $('attendance-history-list');
  if (!container) return;
  const history = UStore.get('attendanceHistory', []);
  if (history.length === 0) { container.innerHTML = `<p class="empty-msg"><span class="empty-icon">📜</span>No records yet. Mark attendance to see history.</p>`; return; }
  const icons = { present: '✅', absent: '❌', cancel: '⏭' };
  container.innerHTML = [...history].reverse().slice(0, 50).map(h => `<div class="history-item"><span class="history-icon">${icons[h.status] || '📋'}</span><span class="history-subject">${h.subName}</span><span class="history-status">${h.status}</span><span class="history-date">${fmt(h.date)}</span></div>`).join('');
}

function clearAttendanceHistory() {
  if (!confirm('Clear all attendance history?')) return;
  UStore.del('attendanceHistory');
  renderAttendanceHistory();
  showToast('History cleared.', 'info');
}

function quickAttendCalc() {
  const a = parseInt($('q-attended')?.value) || 0;
  const t = parseInt($('q-total')?.value) || 0;
  const res = $('q-result');
  if (!res || t === 0) { if (res) res.innerHTML = ''; return; }
  const pct = ((a / t) * 100).toFixed(1);
  const color = pct >= 75 ? 'var(--green)' : 'var(--red)';
  res.innerHTML = `<span style="font-size:1.4rem;font-weight:700;color:${color}">${pct}%</span> &nbsp; <span style="font-size:0.8rem;color:var(--text-muted)">(${a}/${t} classes)</span>`;
}

function addQuickSGPARow() {
  const container = $('quick-sgpa-subjects');
  const row = document.createElement('div');
  row.className = 'quick-sgpa-row';
  row.innerHTML = `<input type="number" placeholder="Credits" min="1" max="6" class="q-credits" oninput="quickSGPACalc()"/><input type="number" placeholder="Grade Pts" min="0" max="10" step="0.01" class="q-grade" oninput="quickSGPACalc()"/>`;
  container?.appendChild(row);
}

function quickSGPACalc() {
  const rows = document.querySelectorAll('.quick-sgpa-row');
  let tc = 0, ws = 0;
  rows.forEach(r => {
    const cr = parseFloat(r.querySelector('.q-credits')?.value) || 0;
    const gp = parseFloat(r.querySelector('.q-grade')?.value) || 0;
    tc += cr; ws += cr * gp;
  });
  const res = $('q-sgpa-result');
  if (!res) return;
  if (tc === 0) { res.innerHTML = ''; return; }
  const sgpa = (ws / tc).toFixed(2);
  res.innerHTML = `<span style="font-size:1.4rem;font-weight:700;color:var(--primary)">SGPA: ${sgpa}</span>`;
}

// ═══════════════════════════════════════════════════
// SMART ATTENDANCE PREDICTOR
// ═══════════════════════════════════════════════════
function runPredictor() {
  const attended = parseInt($('pred-attended')?.value) || 0;
  const total = parseInt($('pred-total')?.value) || 0;
  const remaining = parseInt($('pred-remaining')?.value) || 0;
  const resultsEl = $('predictor-results');
  if (!resultsEl || total === 0) { resultsEl?.classList.add('hidden'); return; }
  resultsEl.classList.remove('hidden');
  const pct = (attended / total) * 100;

  // Circle fill
  const fill = $('pred-circle-fill');
  const circumference = 2 * Math.PI * 42;
  if (fill) {
    fill.style.stroke = pct >= 85 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';
    fill.style.transition = 'stroke-dasharray 0.8s ease';
    fill.setAttribute('stroke-dasharray', `${(pct / 100) * circumference} ${circumference}`);
  }
  const pctText = $('pred-pct-text'); if (pctText) pctText.textContent = pct.toFixed(1) + '%';

  const statusTitle = $('pred-status-title');
  const statusDesc = $('pred-status-desc');
  if (statusTitle) statusTitle.textContent = pct >= 85 ? '🟢 Excellent!' : pct >= 75 ? '🟡 Safe Zone' : '🔴 Danger Zone';
  if (statusDesc) statusDesc.textContent = pct >= 75 ? `You're ${pct.toFixed(1)}% — above the 75% requirement.` : `Your attendance is below 75%. Immediate action required.`;

  // Threshold cards
  const grid = $('pred-threshold-grid');
  if (grid) {
    const thresholds = [75, 80, 85, 90];
    grid.innerHTML = thresholds.map(thresh => {
      const needed = Math.ceil((thresh / 100 * (total + remaining) - attended));
      const possible = remaining >= needed;
      const alreadyAt = pct >= thresh;
      let text, color;
      if (alreadyAt) { text = '✅ Already above!'; color = '#10b981'; }
      else if (!possible) { text = '❌ Not achievable'; color = '#ef4444'; }
      else { text = `Attend ${needed} more class${needed !== 1 ? 'es' : ''}`; color = thresh <= 75 ? '#f59e0b' : '#3b82f6'; }
      return `<div class="pred-threshold-card" style="border-top:3px solid ${color}"><div class="ptc-target">${thresh}%</div><div class="ptc-text" style="color:${color}">${text}</div></div>`;
    }).join('');
  }

  // Skip info
  const skipEl = $('pred-skip-info');
  if (skipEl) {
    if (pct >= 75) {
      const canSkip75 = Math.floor((attended - 0.75 * total) / 0.75);
      skipEl.innerHTML = `<div class="skip-highlight">You can safely miss <strong>${canSkip75}</strong> more class${canSkip75 !== 1 ? 'es' : ''} and still stay above 75%</div>`;
    } else {
      const needFor75 = Math.ceil((0.75 * total - attended) / 0.25);
      skipEl.innerHTML = `<div class="skip-highlight danger">You must attend the next <strong>${needFor75}</strong> class${needFor75 !== 1 ? 'es' : ''} without a break to recover to 75%</div>`;
    }
  }

  // Projection bars
  const projEl = $('pred-projection');
  if (projEl && remaining > 0) {
    const scenarios = [
      { label: 'If you attend ALL remaining', a: attended + remaining, t: total + remaining },
      { label: 'If you attend 80% remaining', a: attended + Math.floor(remaining * 0.8), t: total + remaining },
      { label: 'If you attend 50% remaining', a: attended + Math.floor(remaining * 0.5), t: total + remaining },
      { label: 'If you attend NONE remaining', a: attended, t: total + remaining },
    ];
    projEl.innerHTML = scenarios.map(sc => {
      const fp = ((sc.a / sc.t) * 100).toFixed(1);
      const color = fp >= 85 ? '#10b981' : fp >= 75 ? '#f59e0b' : '#ef4444';
      return `<div class="proj-row"><span class="proj-label">${sc.label}</span><div class="proj-bar-wrap"><div class="proj-bar" style="width:${fp}%;background:${color}"></div></div><span class="proj-val" style="color:${color}">${fp}%</span></div>`;
    }).join('');
  }
}

// ═══════════════════════════════════════════════════
// RESOURCE MANAGER
// ═══════════════════════════════════════════════════
let currentCategoryFilter = 'all';

function openResourceModal(id = null) {
  $('res-edit-id').value = id || '';
  if (id) {
    const resources = UStore.get('resources', []);
    const r = resources.find(x => x.id === id);
    if (r) { $('res-title').value = r.title; $('res-url').value = r.url || ''; $('res-category').value = r.category; $('res-notes').value = r.notes || ''; $('resource-modal-title').textContent = '✏️ Edit Resource'; }
  } else {
    $('res-title').value = ''; $('res-url').value = ''; $('res-notes').value = '';
    $('resource-modal-title').textContent = '🔗 Add Resource';
  }
  $('resource-modal').classList.add('active');
}

function closeResourceModal() { $('resource-modal')?.classList.remove('active'); }

function saveResource() {
  const title = $('res-title')?.value.trim();
  if (!title) return showToast('Please enter a title.', 'error');
  const resources = UStore.get('resources', []);
  const editId = $('res-edit-id')?.value;
  const entry = { id: editId || uid(), title, url: $('res-url')?.value.trim(), category: $('res-category')?.value, notes: $('res-notes')?.value.trim(), createdAt: Date.now() };
  if (editId) { const idx = resources.findIndex(r => r.id === editId); if (idx > -1) resources[idx] = entry; }
  else resources.push(entry);
  UStore.set('resources', resources);
  closeResourceModal();
  renderResources();
  updateDashboard();
  showToast(editId ? 'Resource updated!' : 'Resource saved!', 'success');
}

function deleteResource(id) {
  if (!confirm('Delete this resource?')) return;
  const resources = UStore.get('resources', []).filter(r => r.id !== id);
  UStore.set('resources', resources);
  renderResources();
  updateDashboard();
  showToast('Resource deleted.', 'info');
}

function renderResources() {
  const container = $('resources-grid');
  const empty = $('resources-empty');
  if (!container) return;
  let resources = UStore.get('resources', []);
  const search = $('resource-search')?.value.toLowerCase() || '';
  if (currentCategoryFilter !== 'all') resources = resources.filter(r => r.category === currentCategoryFilter);
  if (search) resources = resources.filter(r => r.title.toLowerCase().includes(search) || (r.notes || '').toLowerCase().includes(search));
  if (resources.length === 0) {
    if (empty) empty.style.display = '';
    container.querySelectorAll('.resource-card').forEach(c => c.remove());
    return;
  }
  if (empty) empty.style.display = 'none';
  const catIcons = { LinkedIn: '💼', GitHub: '🐱', LeetCode: '💻', Notes: '📝', PDFs: '📄', YouTube: '▶️', PYQ: '📋', Website: '🌐', Custom: '⭐' };
  const catColors = { LinkedIn: '#0077b5', GitHub: '#333', LeetCode: '#f89f1b', Notes: '#10b981', PDFs: '#ef4444', YouTube: '#ff0000', PYQ: '#8b5cf6', Website: '#3b82f6', Custom: '#f59e0b' };
  container.innerHTML = resources.map(r => `
    <div class="resource-card">
      <div class="rc-cat-badge" style="background:${catColors[r.category] || '#94a3b8'}15;color:${catColors[r.category] || '#94a3b8'}">${catIcons[r.category] || '🔗'} ${r.category}</div>
      <h3 class="rc-title">${r.title}</h3>
      ${r.notes ? `<p class="rc-notes">${r.notes}</p>` : ''}
      <div class="rc-actions">
        ${r.url ? `<a href="${r.url}" target="_blank" class="btn btn-sm btn-primary">Open →</a>` : '<span></span>'}
        <div class="rc-icons">
          <button class="icon-btn" onclick="openResourceModal('${r.id}')" title="Edit">✏️</button>
          <button class="icon-btn" onclick="deleteResource('${r.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    </div>`).join('');
  if (empty) empty.style.display = 'none';
}

function filterResources() { renderResources(); }

function filterByCategory(cat, btn) {
  currentCategoryFilter = cat;
  document.querySelectorAll('#module-resources .cat-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  renderResources();
}

// ═══════════════════════════════════════════════════
// RESUME BUILDER
// ═══════════════════════════════════════════════════
function showResumeTab(tab, btn) {
  document.querySelectorAll('#module-resume .tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#module-resume .tab-btn').forEach(b => b.classList.remove('active'));
  $('resume-tab-' + tab)?.classList.add('active');
  btn?.classList.add('active');
}

function updateResume() {
  $('rp-name').textContent = $('r-name')?.value || 'Your Name';
  $('rp-email').textContent = $('r-email')?.value || 'email@example.com';
  $('rp-phone').textContent = $('r-phone')?.value || '+91 00000 00000';
  $('rp-linkedin').textContent = $('r-linkedin')?.value || 'linkedin.com/in/profile';
  $('rp-github').textContent = $('r-github')?.value || 'github.com/profile';
  $('rp-degree').textContent = $('r-degree')?.value || 'B.Tech Computer Science';
  $('rp-college').textContent = $('r-college')?.value || 'Your College';
  $('rp-cgpa').textContent = $('r-cgpa')?.value ? `CGPA: ${$('r-cgpa').value}` : 'CGPA: —';
  $('rp-grad-year').textContent = $('r-grad-year')?.value || 'Year';
  // Skills
  const langs = $('r-languages')?.value.trim();
  const tech = $('r-technologies')?.value.trim();
  const tools = $('r-tools')?.value.trim();
  let skillsHTML = '';
  if (langs) skillsHTML += `<div class="rp-skill-row"><strong>Languages:</strong> ${langs}</div>`;
  if (tech) skillsHTML += `<div class="rp-skill-row"><strong>Frameworks:</strong> ${tech}</div>`;
  if (tools) skillsHTML += `<div class="rp-skill-row"><strong>Tools:</strong> ${tools}</div>`;
  $('rp-skills-content').innerHTML = skillsHTML || '<p style="color:#999;font-size:0.85rem">Add your skills above</p>';
  // Projects
  const projects = document.querySelectorAll('#resume-projects .resume-entry');
  let projHTML = '';
  projects.forEach(p => {
    const name = p.querySelector('.proj-name')?.value.trim();
    const desc = p.querySelector('.proj-desc')?.value.trim();
    const tech = p.querySelector('.proj-tech')?.value.trim();
    if (name) projHTML += `<div class="rp-project"><strong>${name}</strong>${tech ? ` <span style="color:#666;font-size:0.8em">· ${tech}</span>` : ''}<br>${desc ? `<span style="color:#555;font-size:0.85em">${desc}</span>` : ''}</div>`;
  });
  $('rp-projects-content').innerHTML = projHTML || '<p style="color:#999;font-size:0.85rem">Add your projects above</p>';
  // Achievements
  const achs = document.querySelectorAll('#resume-achievements .resume-entry');
  let achHTML = '';
  achs.forEach(a => {
    const type = a.querySelector('.ach-type')?.value;
    const title = a.querySelector('.ach-title')?.value.trim();
    const desc = a.querySelector('.ach-desc')?.value.trim();
    if (title) achHTML += `<div class="rp-ach"><strong>${title}</strong>${desc ? ` — ${desc}` : ''} <span style="color:#888;font-size:0.8em">[${type}]</span></div>`;
  });
  $('rp-achievements-content').innerHTML = achHTML || '<p style="color:#999;font-size:0.85rem">Add achievements above</p>';
  calcResumeScore();
}

function calcResumeScore() {
  const checks = [
    $('r-name')?.value.trim(), $('r-email')?.value.trim(), $('r-phone')?.value.trim(),
    $('r-college')?.value.trim(), $('r-degree')?.value.trim(), $('r-languages')?.value.trim(),
    $('r-technologies')?.value.trim(), $('r-tools')?.value.trim(),
    document.querySelector('.proj-name')?.value.trim(), document.querySelector('.ach-title')?.value.trim()
  ];
  const filled = checks.filter(Boolean).length;
  const pct = Math.round((filled / checks.length) * 100);
  const fillEl = $('resume-score-fill'); if (fillEl) fillEl.style.width = pct + '%';
  const pctEl = $('resume-score-pct'); if (pctEl) pctEl.textContent = pct + '%';
  const tips = $('resume-score-tips');
  if (tips) {
    const missing = ['Name', 'Email', 'Phone', 'College', 'Degree', 'Languages', 'Frameworks', 'Tools', 'Project', 'Achievement'].filter((_, i) => !checks[i]);
    tips.innerHTML = missing.length === 0 ? '<span class="rs-tip rs-tip-done">✅ Resume is complete!</span>' : missing.slice(0, 3).map(m => `<span class="rs-tip">Missing: ${m}</span>`).join('');
  }
}

function addResumeProject() {
  const container = $('resume-projects');
  const idx = container.children.length;
  const div = document.createElement('div');
  div.className = 'resume-entry'; div.dataset.index = idx;
  div.innerHTML = `<div class="resume-entry-header"><span class="entry-label">Project ${idx + 1}</span><button class="remove-btn" onclick="removeResumeEntry(this,'resume-projects',updateResume)" title="Remove">✕</button></div><div class="form-grid"><div class="form-group full-width"><label>Project Name *</label><input type="text" placeholder="e.g. Student Portal" class="proj-name" oninput="updateResume()"/></div><div class="form-group full-width"><label>Description</label><textarea placeholder="Brief description…" class="proj-desc" rows="2" oninput="updateResume()"></textarea></div><div class="form-group full-width"><label>Tech Stack</label><input type="text" placeholder="e.g. React, Firebase" class="proj-tech" oninput="updateResume()"/></div></div>`;
  container.appendChild(div);
}

function addResumeAchievement() {
  const container = $('resume-achievements');
  const idx = container.children.length;
  const div = document.createElement('div');
  div.className = 'resume-entry'; div.dataset.index = idx;
  div.innerHTML = `<div class="resume-entry-header"><span class="entry-label">Achievement ${idx + 1}</span><button class="remove-btn" onclick="removeResumeEntry(this,'resume-achievements',updateResume)" title="Remove">✕</button></div><div class="form-grid"><div class="form-group"><label>Type</label><select class="ach-type" onchange="updateResume()"><option value="Certification">Certification</option><option value="Award">Award</option><option value="Activity">Activity</option><option value="Leadership">Leadership</option></select></div><div class="form-group"><label>Title *</label><input type="text" placeholder="e.g. AWS Cloud Practitioner" class="ach-title" oninput="updateResume()"/></div><div class="form-group full-width"><label>Description (Optional)</label><input type="text" placeholder="Brief detail…" class="ach-desc" oninput="updateResume()"/></div></div>`;
  container.appendChild(div);
}

function removeResumeEntry(btn, containerId, callback) {
  const row = btn.closest('.resume-entry');
  const container = $(containerId);
  if (row && container && container.children.length > 1) { row.remove(); if (typeof callback === 'function') callback(); }
  else showToast('Keep at least one entry.', 'info');
}

function printResume() {
  window.print();
}

// ATS Score
function calcATSScore() {
  const resume = $('ats-resume')?.value.toLowerCase() || '';
  const jd = $('ats-jd')?.value.toLowerCase() || '';
  const resultEl = $('ats-result');
  if (!resume || !jd) return showToast('Please paste both your resume and job description.', 'error');
  const jdWords = jd.match(/\b\w{4,}\b/g) || [];
  const uniqueKeywords = [...new Set(jdWords)].filter(w => !['with', 'have', 'that', 'this', 'will', 'from', 'your', 'their', 'they', 'them', 'able'].includes(w));
  const matched = uniqueKeywords.filter(kw => resume.includes(kw));
  const score = Math.round((matched.length / Math.max(uniqueKeywords.length, 1)) * 100);
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Strong Match' : score >= 50 ? 'Moderate Match' : 'Weak Match';
  const topMissing = uniqueKeywords.filter(kw => !resume.includes(kw)).slice(0, 10);
  resultEl.innerHTML = `<div style="text-align:center;margin-bottom:20px"><div style="font-size:3rem;font-weight:800;color:${color}">${score}%</div><div style="font-size:1.1rem;color:${color};font-weight:600">${label}</div></div><div class="ats-detail"><strong>✅ Matched Keywords (${matched.length}):</strong><p style="margin-top:8px;color:var(--text-secondary)">${matched.slice(0, 20).join(', ') || 'None matched'}</p></div>${topMissing.length ? `<div class="ats-detail" style="margin-top:12px"><strong>❌ Missing Keywords (add these):</strong><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${topMissing.map(k => `<span class="ats-keyword">${k}</span>`).join('')}</div></div>` : ''}`;
  resultEl.classList.remove('hidden');
}

// ═══════════════════════════════════════════════════
// ASSIGNMENT MANAGER
// ═══════════════════════════════════════════════════
let assignmentCategoryFilter = 'all';

function openAssignmentModal(id = null) {
  $('assign-edit-id').value = id || '';
  if (id) {
    const assignments = UStore.get('assignments', []);
    const a = assignments.find(x => x.id === id);
    if (a) { $('assign-title').value = a.title; $('assign-subject').value = a.subject || ''; $('assign-due').value = a.due || ''; $('assign-priority').value = a.priority; $('assign-status').value = a.status; $('assign-notes').value = a.notes || ''; $('assignment-modal-title').textContent = '✏️ Edit Assignment'; }
  } else {
    $('assign-title').value = ''; $('assign-subject').value = ''; $('assign-due').value = today(); $('assign-priority').value = 'medium'; $('assign-status').value = 'pending'; $('assign-notes').value = '';
    $('assignment-modal-title').textContent = '✅ Add Assignment';
  }
  $('assignment-modal').classList.add('active');
}

function closeAssignmentModal() { $('assignment-modal')?.classList.remove('active'); }

function saveAssignment() {
  const title = $('assign-title')?.value.trim();
  const due = $('assign-due')?.value;
  if (!title || !due) return showToast('Please enter title and due date.', 'error');
  const assignments = UStore.get('assignments', []);
  const editId = $('assign-edit-id')?.value;
  const entry = { id: editId || uid(), title, subject: $('assign-subject')?.value.trim(), due, priority: $('assign-priority')?.value, status: $('assign-status')?.value, notes: $('assign-notes')?.value.trim(), createdAt: Date.now() };
  if (editId) { const idx = assignments.findIndex(a => a.id === editId); if (idx > -1) assignments[idx] = entry; }
  else assignments.push(entry);
  UStore.set('assignments', assignments);
  closeAssignmentModal();
  renderAssignments();
  updateDashboard();
  showToast(editId ? 'Assignment updated!' : 'Assignment added!', 'success');
}

function deleteAssignment(id) {
  if (!confirm('Delete this assignment?')) return;
  const assignments = UStore.get('assignments', []).filter(a => a.id !== id);
  UStore.set('assignments', assignments);
  renderAssignments();
  updateDashboard();
  showToast('Assignment deleted.', 'info');
}

function toggleAssignmentDone(id) {
  const assignments = UStore.get('assignments', []);
  const a = assignments.find(x => x.id === id);
  if (a) { a.status = a.status === 'done' ? 'pending' : 'done'; }
  UStore.set('assignments', assignments);
  renderAssignments();
  updateDashboard();
}

function filterAssignments(filter, btn) {
  assignmentCategoryFilter = filter;
  document.querySelectorAll('.assignment-filters .cat-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  renderAssignments();
}

function renderAssignments() {
  const container = $('assignments-list');
  if (!container) return;
  let assignments = UStore.get('assignments', []);
  // Apply filter
  if (assignmentCategoryFilter === 'pending') assignments = assignments.filter(a => a.status === 'pending');
  else if (assignmentCategoryFilter === 'in-progress') assignments = assignments.filter(a => a.status === 'in-progress');
  else if (assignmentCategoryFilter === 'done') assignments = assignments.filter(a => a.status === 'done');
  else if (assignmentCategoryFilter === 'high') assignments = assignments.filter(a => a.priority === 'high');
  // Sort by due date
  assignments.sort((a, b) => new Date(a.due) - new Date(b.due));
  if (assignments.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><h3>${UStore.get('assignments', []).length === 0 ? 'No assignments yet' : 'No assignments match this filter'}</h3><p>${UStore.get('assignments', []).length === 0 ? 'Add your first assignment to start tracking' : 'Try a different filter'}</p><button class="btn btn-primary" onclick="openAssignmentModal()">+ Add Assignment</button></div>`;
    return;
  }
  const prioColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
  const statusIcons = { pending: '🔴', 'in-progress': '🟡', done: '🟢' };
  container.innerHTML = assignments.map(a => {
    const days = daysFromNow(a.due);
    const isOverdue = days < 0 && a.status !== 'done';
    return `<div class="assignment-card ${a.status === 'done' ? 'assignment-done' : ''}">
      <div class="ac-priority-bar" style="background:${prioColors[a.priority] || '#3b82f6'}"></div>
      <div class="ac-body">
        <div class="ac-top">
          <div class="ac-title-wrap">
            <input type="checkbox" class="ac-checkbox" ${a.status === 'done' ? 'checked' : ''} onchange="toggleAssignmentDone('${a.id}')">
            <span class="ac-title ${a.status === 'done' ? 'ac-title-done' : ''}">${a.title}</span>
          </div>
          <div class="ac-actions">
            <button class="icon-btn" onclick="openAssignmentModal('${a.id}')" title="Edit">✏️</button>
            <button class="icon-btn" onclick="deleteAssignment('${a.id}')" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="ac-meta">
          ${a.subject ? `<span class="ac-badge ac-subject">${a.subject}</span>` : ''}
          <span class="ac-badge" style="background:${prioColors[a.priority]}20;color:${prioColors[a.priority]}">${a.priority} priority</span>
          <span class="ac-badge">${statusIcons[a.status] || ''} ${a.status}</span>
          <span class="ac-due ${isOverdue ? 'ac-due-overdue' : days <= 2 ? 'ac-due-soon' : ''}">📅 ${isOverdue ? 'Overdue' : days === 0 ? 'Due Today' : days === 1 ? 'Due Tomorrow' : `Due in ${days}d`} · ${fmt(a.due)}</span>
        </div>
        ${a.notes ? `<p class="ac-notes">${a.notes}</p>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════
// AI STUDY PLANNER
// ═══════════════════════════════════════════════════
function generateStudyPlan() {
  const subjectsRaw = $('planner-subjects')?.value.trim();
  const examsRaw = $('planner-exams')?.value.trim();
  const hoursPerDay = parseInt($('planner-hours')?.value) || 6;
  const startDate = $('planner-start')?.value || today();
  const progressRaw = $('planner-progress')?.value.trim();

  if (!subjectsRaw) return showToast('Please enter at least one subject.', 'error');

  const subjects = subjectsRaw.split('\n').map(s => s.trim()).filter(Boolean);
  const examMap = {};
  examsRaw?.split('\n').forEach(line => {
    const [subj, date] = line.split(':').map(s => s.trim());
    if (subj && date) examMap[subj.toLowerCase()] = date;
  });
  const progressMap = {};
  progressRaw?.split('\n').forEach(line => {
    const [subj, pct] = line.split(':').map(s => s.trim());
    if (subj && pct) progressMap[subj.toLowerCase()] = parseInt(pct) || 0;
  });

  // Score subjects by urgency
  const scored = subjects.map(sub => {
    const examDate = examMap[sub.toLowerCase()];
    const daysLeft = examDate ? daysFromNow(examDate) : 999;
    const progress = progressMap[sub.toLowerCase()] || 0;
    const remaining = 100 - progress;
    const urgency = remaining / Math.max(daysLeft, 1);
    return { name: sub, daysLeft, progress, remaining, urgency, examDate };
  }).sort((a, b) => b.urgency - a.urgency);

  const hoursPerSubject = Math.floor((hoursPerDay / subjects.length) * 10) / 10;

  // Generate plan HTML
  const outputEl = $('ai-plan-output');
  const placeholder = $('ai-placeholder');
  if (!outputEl) return;

  // Save plan
  UStore.set('studyPlan', { subjects, examsRaw, hoursPerDay, startDate, progressRaw, generated: Date.now() });

  const dailyPlan = generateDailySchedule(scored, hoursPerDay, startDate);

  outputEl.innerHTML = `
    <div class="ai-plan-section">
      <h3>🎯 Priority Order</h3>
      <div class="priority-list">
        ${scored.map((s, i) => `
          <div class="priority-item">
            <span class="priority-rank">#${i + 1}</span>
            <div class="priority-info">
              <span class="priority-name">${s.name}</span>
              <span class="priority-meta">${s.examDate ? `Exam: ${fmt(s.examDate)} (${s.daysLeft}d)` : 'No exam date'} · ${s.progress}% done</span>
            </div>
            <div class="priority-bar-wrap">
              <div class="priority-bar" style="width:${s.progress}%;background:${s.progress >= 70 ? '#10b981' : s.progress >= 40 ? '#f59e0b' : '#ef4444'}"></div>
            </div>
            <span class="priority-pct">${s.remaining}% left</span>
          </div>`).join('')}
      </div>
    </div>

    <div class="ai-plan-section">
      <h3>📅 Daily Study Plan (${hoursPerDay} hrs/day)</h3>
      <div class="daily-schedule">
        ${scored.map(s => `
          <div class="schedule-item">
            <div class="si-subj">${s.name}</div>
            <div class="si-hours">${hoursPerSubject} hrs/day</div>
            <div class="si-focus">${s.remaining > 60 ? 'Deep Study' : s.remaining > 30 ? 'Regular Study' : 'Light Revision'}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="ai-plan-section">
      <h3>📆 Weekly Schedule</h3>
      <div class="weekly-schedule">
        ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
          const daySubjects = scored.filter((_, idx) => idx % 7 === i % 7).slice(0, 2);
          return `<div class="week-day"><div class="wd-label">${day}</div><div class="wd-subjects">${daySubjects.map(s => `<span class="wd-subject">${s.name}</span>`).join('') || '<span class="wd-rest">Rest / Review</span>'}</div><div class="wd-hours">${hoursPerDay}h</div></div>`;
        }).join('')}
      </div>
    </div>

    <div class="ai-plan-section">
      <h3>📝 Revision Timetable</h3>
      <div class="revision-table">
        ${scored.filter(s => s.examDate).sort((a, b) => a.daysLeft - b.daysLeft).map(s => {
          const revDays = [s.daysLeft - 3, s.daysLeft - 1].filter(d => d > 0);
          return `<div class="rev-row"><span class="rev-subj">${s.name}</span><span class="rev-exam">Exam: ${s.examDate ? fmt(s.examDate) : 'TBD'}</span><span class="rev-days">Revise: D-3, D-1 before exam</span></div>`;
        }).join('') || '<p style="color:var(--text-muted)">Add exam dates above to see revision schedule.</p>'}
      </div>
    </div>

    <div class="ai-plan-section">
      <h3>📊 Remaining Syllabus Tracker</h3>
      <div class="syllabus-tracker">
        ${scored.map(s => `
          <div class="st-row">
            <span class="st-subj">${s.name}</span>
            <div class="st-bar-wrap">
              <div class="st-completed" style="width:${s.progress}%"></div>
              <div class="st-remaining" style="width:${s.remaining}%"></div>
            </div>
            <span class="st-pcts">${s.progress}% done · ${s.remaining}% left</span>
          </div>`).join('')}
      </div>
    </div>

    <div class="ai-tip-box">
      <span class="ai-tip-icon">💡</span>
      <div><strong>AI Tip:</strong> Focus on <strong>${scored[0]?.name || 'your priority subject'}</strong> first — it has the highest urgency score. Use the Pomodoro technique: 25 min study, 5 min break.</div>
    </div>

    <div style="text-align:center;margin-top:20px">
      <button class="btn btn-outline" onclick="clearStudyPlan()">🔄 Generate New Plan</button>
    </div>
  `;

  outputEl.classList.remove('hidden');
  if (placeholder) placeholder.classList.add('hidden');
  showToast('AI Study Plan generated! 🎉', 'success');
}

function generateDailySchedule(subjects, hoursPerDay, startDate) {
  return subjects.map(s => ({ subject: s.name, hours: Math.floor(hoursPerDay / subjects.length * 10) / 10 }));
}

function clearStudyPlan() {
  UStore.del('studyPlan');
  $('ai-plan-output')?.classList.add('hidden');
  $('ai-placeholder')?.classList.remove('hidden');
}

// ═══════════════════════════════════════════════════
// CODING DASHBOARD
// ═══════════════════════════════════════════════════
function saveCodingLinks() {
  const links = {
    github: $('coding-github')?.value.trim(),
    leetcode: $('coding-leetcode')?.value.trim(),
    codeforces: $('coding-codeforces')?.value.trim(),
    codechef: $('coding-codechef')?.value.trim()
  };
  UStore.set('codingLinks', links);
  renderCodingQuickLinks(links);
  showToast('Links saved!', 'success');
}

function renderCodingQuickLinks(links) {
  const container = $('coding-quick-links');
  if (!container) return;
  const items = [
    { key: 'github', label: '🐱 GitHub', color: '#333' },
    { key: 'leetcode', label: '💻 LeetCode', color: '#f89f1b' },
    { key: 'codeforces', label: '⚡ Codeforces', color: '#1994D1' },
    { key: 'codechef', label: '👨‍🍳 CodeChef', color: '#5b4638' }
  ];
  const activeLinks = items.filter(i => links[i.key]);
  if (activeLinks.length === 0) { container.innerHTML = `<p class="empty-msg" style="padding:12px 0;">Save your profile links above to see quick-open buttons.</p>`; return; }
  container.innerHTML = `<div class="quick-links-grid">${activeLinks.map(i => `<a href="${links[i.key]}" target="_blank" class="ql-btn" style="border-color:${i.color}20;color:${i.color}">${i.label} ↗</a>`).join('')}</div>`;
}

function updateCodingStats() {
  const easy = parseInt($('lc-easy')?.value) || 0;
  const medium = parseInt($('lc-medium')?.value) || 0;
  const hard = parseInt($('lc-hard')?.value) || 0;
  const total = easy + medium + hard;
  const maxEasy = 800, maxMedium = 1700, maxHard = 700;
  const setBar = (id, valId, val, max) => {
    const bar = $(id); if (bar) bar.style.width = Math.min((val / max) * 100, 100) + '%';
    const valEl = $(valId); if (valEl) valEl.textContent = val;
  };
  setBar('cpb-easy', 'cpb-easy-val', easy, maxEasy);
  setBar('cpb-medium', 'cpb-medium-val', medium, maxMedium);
  setBar('cpb-hard', 'cpb-hard-val', hard, maxHard);
  const totalBadge = $('coding-total-badge');
  if (totalBadge) totalBadge.textContent = `Total: ${total} problem${total !== 1 ? 's' : ''} solved`;
  updateGoalTracker();
}

function updateGoalTracker() {
  const goalProbs = parseInt($('goal-problems')?.value) || 0;
  const goalStreak = parseInt($('goal-streak')?.value) || 0;
  const easy = parseInt($('lc-easy')?.value) || 0;
  const medium = parseInt($('lc-medium')?.value) || 0;
  const hard = parseInt($('lc-hard')?.value) || 0;
  const total = easy + medium + hard;
  const streak = parseInt($('lc-streak')?.value) || 0;
  const display = $('goal-tracker-display');
  if (!display || (!goalProbs && !goalStreak)) { if (display) display.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">Set goals above to track progress.</p>'; return; }
  let html = '';
  if (goalProbs > 0) {
    const probPct = Math.min(Math.round((total / goalProbs) * 100), 100);
    html += `<div class="goal-item"><div class="goal-label"><span>Problems Goal</span><span>${total} / ${goalProbs}</span></div><div class="goal-bar-wrap"><div class="goal-bar" style="width:${probPct}%"></div></div><span class="goal-pct">${probPct}%</span></div>`;
  }
  if (goalStreak > 0) {
    const streakPct = Math.min(Math.round((streak / goalStreak) * 100), 100);
    html += `<div class="goal-item"><div class="goal-label"><span>Streak Goal</span><span>${streak} / ${goalStreak} days</span></div><div class="goal-bar-wrap"><div class="goal-bar goal-bar-streak" style="width:${streakPct}%"></div></div><span class="goal-pct">${streakPct}%</span></div>`;
  }
  display.innerHTML = html;
}

function saveCodingStats() {
  const stats = {
    easy: parseInt($('lc-easy')?.value) || 0,
    medium: parseInt($('lc-medium')?.value) || 0,
    hard: parseInt($('lc-hard')?.value) || 0,
    streak: parseInt($('lc-streak')?.value) || 0,
    goalProblems: parseInt($('goal-problems')?.value) || 0,
    goalStreak: parseInt($('goal-streak')?.value) || 0,
  };
  UStore.set('codingStats', stats);
  updateDashStats();
  showToast('Stats saved!', 'success');
}

function renderCodingStats() {
  const stats = UStore.get('codingStats', {});
  const links = UStore.get('codingLinks', {});
  if (stats.easy !== undefined) { $('lc-easy') && ($('lc-easy').value = stats.easy); }
  if (stats.medium !== undefined) { $('lc-medium') && ($('lc-medium').value = stats.medium); }
  if (stats.hard !== undefined) { $('lc-hard') && ($('lc-hard').value = stats.hard); }
  if (stats.streak !== undefined) { $('lc-streak') && ($('lc-streak').value = stats.streak); }
  if (stats.goalProblems) { $('goal-problems') && ($('goal-problems').value = stats.goalProblems); }
  if (stats.goalStreak) { $('goal-streak') && ($('goal-streak').value = stats.goalStreak); }
  if (links.github) { $('coding-github') && ($('coding-github').value = links.github); }
  if (links.leetcode) { $('coding-leetcode') && ($('coding-leetcode').value = links.leetcode); }
  if (links.codeforces) { $('coding-codeforces') && ($('coding-codeforces').value = links.codeforces); }
  if (links.codechef) { $('coding-codechef') && ($('coding-codechef').value = links.codechef); }
  updateCodingStats();
  renderCodingQuickLinks(links);
}

// ═══════════════════════════════════════════════════
// EXPENSE TRACKER
// ═══════════════════════════════════════════════════
let expenseCategoryFilter = 'all';

function openExpenseModal(id = null) {
  $('exp-edit-id').value = id || '';
  if (id) {
    const expenses = UStore.get('expenses', []);
    const e = expenses.find(x => x.id === id);
    if (e) { $('exp-title').value = e.title; $('exp-amount').value = e.amount; $('exp-category').value = e.category; $('exp-date').value = e.date || today(); $('exp-notes').value = e.notes || ''; $('expense-modal-title').textContent = '✏️ Edit Expense'; }
  } else {
    $('exp-title').value = ''; $('exp-amount').value = ''; $('exp-date').value = today(); $('exp-notes').value = '';
    $('expense-modal-title').textContent = '💰 Add Expense';
  }
  $('expense-modal').classList.add('active');
}

function closeExpenseModal() { $('expense-modal')?.classList.remove('active'); }

function saveExpense() {
  const title = $('exp-title')?.value.trim();
  const amount = parseFloat($('exp-amount')?.value);
  if (!title || isNaN(amount) || amount <= 0) return showToast('Please enter a valid title and amount.', 'error');
  const expenses = UStore.get('expenses', []);
  const editId = $('exp-edit-id')?.value;
  const entry = { id: editId || uid(), title, amount, category: $('exp-category')?.value, date: $('exp-date')?.value || today(), notes: $('exp-notes')?.value.trim(), createdAt: Date.now() };
  if (editId) { const idx = expenses.findIndex(e => e.id === editId); if (idx > -1) expenses[idx] = entry; }
  else expenses.push(entry);
  UStore.set('expenses', expenses);
  closeExpenseModal();
  renderExpenses();
  updateDashboard();
  showToast(editId ? 'Expense updated!' : 'Expense added!', 'success');
}

function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  const expenses = UStore.get('expenses', []).filter(e => e.id !== id);
  UStore.set('expenses', expenses);
  renderExpenses();
  updateDashboard();
  showToast('Expense deleted.', 'info');
}

function saveBudget() {
  const budget = parseFloat($('expense-budget-input')?.value);
  if (isNaN(budget) || budget < 0) return showToast('Enter a valid budget amount.', 'error');
  UStore.set('monthlyBudget', budget);
  updateExpenseSummary();
  showToast('Budget saved!', 'success');
}

function filterExpenses(cat, btn) {
  expenseCategoryFilter = cat;
  document.querySelectorAll('#module-expenses .category-filter .cat-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  renderExpenses();
}

function updateExpenseSummary() {
  const expenses = UStore.get('expenses', []);
  const budget = UStore.get('monthlyBudget', 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses.filter(e => (e.date || '').startsWith(thisMonth));
  const total = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const savings = budget - total;
  const days = new Date().getDate();
  const avgDaily = days > 0 ? total / days : 0;
  const expTotal = $('exp-total-spent'); if (expTotal) expTotal.textContent = '₹' + Math.round(total).toLocaleString('en-IN');
  const expBudget = $('exp-budget'); if (expBudget) expBudget.textContent = '₹' + Math.round(budget).toLocaleString('en-IN');
  const expSavings = $('exp-savings'); if (expSavings) { expSavings.textContent = '₹' + Math.abs(Math.round(savings)).toLocaleString('en-IN') + (savings < 0 ? ' over' : ''); expSavings.style.color = savings >= 0 ? 'var(--green)' : 'var(--red)'; }
  const expAvg = $('exp-avg-daily'); if (expAvg) expAvg.textContent = '₹' + Math.round(avgDaily).toLocaleString('en-IN');
  if ($('expense-budget-input') && !$('expense-budget-input').value && budget) $('expense-budget-input').value = budget;
  // Budget bar
  const fill = $('budget-bar-fill');
  const used = $('budget-bar-used');
  const pctEl = $('budget-bar-pct');
  if (fill) {
    const pct = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
    fill.style.width = pct + '%';
    fill.style.background = pct >= 90 ? 'var(--red)' : pct >= 75 ? 'var(--amber)' : 'var(--green)';
  }
  if (used) used.textContent = `₹${Math.round(total).toLocaleString('en-IN')} used`;
  if (pctEl) pctEl.textContent = budget > 0 ? `${Math.round((total / budget) * 100)}% of budget` : 'No budget set';
  updateExpenseChart();
}

function updateExpenseChart() {
  const chartEl = $('expense-chart');
  if (!chartEl) return;
  const expenses = UStore.get('expenses', []);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses.filter(e => (e.date || '').startsWith(thisMonth));
  if (monthExpenses.length === 0) { chartEl.innerHTML = '<p class="empty-msg">No expense data yet.</p>'; return; }
  const cats = {};
  monthExpenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  const total = Object.values(cats).reduce((s, v) => s + v, 0);
  const catColors = { Food: '#ef4444', Transport: '#3b82f6', Books: '#8b5cf6', Entertainment: '#f59e0b', Health: '#10b981', Clothing: '#ec4899', Other: '#94a3b8' };
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  chartEl.innerHTML = sorted.map(([cat, amt]) => {
    const pct = ((amt / total) * 100).toFixed(1);
    const color = catColors[cat] || '#94a3b8';
    const catIcons = { Food: '🍔', Transport: '🚗', Books: '📚', Entertainment: '🎮', Health: '💊', Clothing: '👕', Other: '📦' };
    return `<div class="chart-row"><span class="chart-cat">${catIcons[cat] || '📦'} ${cat}</span><div class="chart-bar-wrap"><div class="chart-bar" style="width:${pct}%;background:${color}"></div></div><span class="chart-pct">₹${Math.round(amt).toLocaleString('en-IN')} (${pct}%)</span></div>`;
  }).join('');
}

function renderExpenses() {
  updateExpenseSummary();
  const container = $('expenses-list');
  if (!container) return;
  let expenses = UStore.get('expenses', []);
  if (expenseCategoryFilter !== 'all') expenses = expenses.filter(e => e.category === expenseCategoryFilter);
  expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (expenses.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💰</div><h3>${UStore.get('expenses', []).length === 0 ? 'No expenses recorded' : 'No expenses in this category'}</h3><p>${UStore.get('expenses', []).length === 0 ? 'Start tracking your spending' : 'Try a different filter'}</p><button class="btn btn-primary" onclick="openExpenseModal()">+ Add Expense</button></div>`;
    return;
  }
  const catIcons = { Food: '🍔', Transport: '🚗', Books: '📚', Entertainment: '🎮', Health: '💊', Clothing: '👕', Other: '📦' };
  const catColors = { Food: '#ef4444', Transport: '#3b82f6', Books: '#8b5cf6', Entertainment: '#f59e0b', Health: '#10b981', Clothing: '#ec4899', Other: '#94a3b8' };
  container.innerHTML = expenses.map(e => `
    <div class="expense-card">
      <div class="exp-cat-icon" style="background:${catColors[e.category] || '#94a3b8'}20;color:${catColors[e.category] || '#94a3b8'}">${catIcons[e.category] || '📦'}</div>
      <div class="exp-info">
        <span class="exp-title">${e.title}</span>
        <span class="exp-meta">${e.category} · ${fmt(e.date)}</span>
        ${e.notes ? `<span class="exp-notes">${e.notes}</span>` : ''}
      </div>
      <span class="exp-amount">₹${e.amount.toLocaleString('en-IN')}</span>
      <div class="exp-actions">
        <button class="icon-btn" onclick="openExpenseModal('${e.id}')" title="Edit">✏️</button>
        <button class="icon-btn" onclick="deleteExpense('${e.id}')" title="Delete">🗑️</button>
      </div>
    </div>`).join('');
}

// ═══════════════════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════════════════
function loadProfile() {
  const profile = UStore.get('profile', {});
  const user = Auth.currentUser();
  const fields = { name: 'prof-name', username: 'prof-username', bio: 'prof-bio', skills: 'prof-skills', college: 'prof-college', branch: 'prof-branch', year: 'prof-year', github: 'prof-github', linkedin: 'prof-linkedin', portfolio: 'prof-portfolio' };
  Object.entries(fields).forEach(([key, id]) => { const el = $(id); if (el && profile[key]) el.value = profile[key]; });
  if (!profile.name && user?.name) { const el = $('prof-name'); if (el) el.value = user.name; }
  // Avatar
  if (profile.avatar) {
    const display = $('profile-avatar-display');
    if (display) { display.style.backgroundImage = `url(${profile.avatar})`; display.style.backgroundSize = 'cover'; display.textContent = ''; }
  }
}

function saveProfile() {
  const profile = {
    name: $('prof-name')?.value.trim(),
    username: $('prof-username')?.value.trim(),
    bio: $('prof-bio')?.value.trim(),
    skills: $('prof-skills')?.value.trim(),
    college: $('prof-college')?.value.trim(),
    branch: $('prof-branch')?.value.trim(),
    year: $('prof-year')?.value,
    github: $('prof-github')?.value.trim(),
    linkedin: $('prof-linkedin')?.value.trim(),
    portfolio: $('prof-portfolio')?.value.trim(),
    avatar: UStore.get('profile', {}).avatar || ''
  };
  UStore.set('profile', profile);
  loadUserDisplay();
  // Show preview
  const previewCard = $('profile-preview-card');
  if (previewCard) {
    previewCard.style.display = '';
    $('pp-name').textContent = profile.name || '—';
    $('pp-username').textContent = profile.username || '—';
    $('pp-college').textContent = profile.college || '—';
    $('pp-branch').textContent = profile.branch || '—';
    $('pp-year').textContent = profile.year || '—';
    $('pp-skills').textContent = profile.skills || '—';
    $('pp-github').textContent = profile.github || '—';
    $('pp-linkedin').textContent = profile.linkedin || '—';
  }
  showToast('Profile saved! ✨', 'success');
}

function resetProfile() {
  if (!confirm('Reset profile to defaults?')) return;
  ['prof-name', 'prof-username', 'prof-bio', 'prof-skills', 'prof-college', 'prof-branch', 'prof-github', 'prof-linkedin', 'prof-portfolio'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  const yr = $('prof-year'); if (yr) yr.value = '';
  const previewCard = $('profile-preview-card'); if (previewCard) previewCard.style.display = 'none';
}

function handleProfilePicUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) return showToast('Image too large. Max 2MB.', 'error');
  const reader = new FileReader();
  reader.onload = e => {
    const data = e.target.result;
    const display = $('profile-avatar-display');
    if (display) { display.style.backgroundImage = `url(${data})`; display.style.backgroundSize = 'cover'; display.textContent = ''; }
    const profile = UStore.get('profile', {}); profile.avatar = data; UStore.set('profile', profile);
    loadUserDisplay();
    showToast('Profile picture updated!', 'success');
  };
  reader.readAsDataURL(file);
}

function removeProfilePic() {
  const display = $('profile-avatar-display');
  if (display) { display.style.backgroundImage = ''; display.textContent = '👤'; }
  const profile = UStore.get('profile', {}); delete profile.avatar; UStore.set('profile', profile);
  loadUserDisplay();
  showToast('Profile picture removed.', 'info');
}

// ═══════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════
function generateNotifications() {
  const container = $('notifications-list');
  if (!container) return;
  const notifications = [];
  const settings = Store.get('campusOS_settings', {});

  // Assignment deadlines
  if (settings.notifAssignments !== false) {
    const assignments = UStore.get('assignments', []);
    assignments.filter(a => a.status !== 'done').forEach(a => {
      const days = daysFromNow(a.due);
      if (days <= 3 && days >= 0) notifications.push({ icon: '✅', type: 'warning', title: `Assignment Due: ${a.title}`, body: `Due ${days === 0 ? 'today' : `in ${days} day${days > 1 ? 's' : ''}`} · ${a.subject || 'No subject'}`, time: new Date().toISOString() });
      else if (days < 0) notifications.push({ icon: '⚠️', type: 'danger', title: `Overdue: ${a.title}`, body: `Was due on ${fmt(a.due)} — ${a.subject || 'No subject'}`, time: new Date().toISOString() });
    });
  }

  // Low attendance
  if (settings.notifAttendance !== false) {
    const subjects = UStore.get('trackerSubjects', []);
    subjects.forEach(sub => {
      const pct = sub.total > 0 ? (sub.attended / sub.total) * 100 : 100;
      if (pct < 75 && sub.total > 0) notifications.push({ icon: '📅', type: 'danger', title: `Low Attendance: ${sub.name}`, body: `Current: ${pct.toFixed(1)}% — below 75% requirement`, time: new Date().toISOString() });
    });
  }

  // Study plan exams
  if (settings.notifExams !== false) {
    const plan = UStore.get('studyPlan', {});
    if (plan.examsRaw) {
      plan.examsRaw.split('\n').forEach(line => {
        const [subj, date] = line.split(':').map(s => s.trim());
        if (subj && date) {
          const days = daysFromNow(date);
          if (days >= 0 && days <= 7) notifications.push({ icon: '📋', type: days <= 2 ? 'danger' : 'warning', title: `Exam: ${subj}`, body: `${days === 0 ? 'Today!' : `In ${days} day${days > 1 ? 's' : ''}`} — ${date}`, time: new Date().toISOString() });
        }
      });
    }
  }

  // Update badge
  const badge = $('nav-badge-notif');
  if (badge) { if (notifications.length > 0) { badge.style.display = 'flex'; badge.textContent = notifications.length; } else badge.style.display = 'none'; }

  if (notifications.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔔</div><h3>All caught up!</h3><p>No upcoming deadlines or alerts. Great job staying on track!</p></div>`;
    return;
  }

  const typeColors = { danger: 'var(--red)', warning: 'var(--amber)', info: 'var(--blue-500)' };
  container.innerHTML = notifications.map(n => `
    <div class="notif-card notif-${n.type}">
      <div class="notif-icon">${n.icon}</div>
      <div class="notif-content">
        <div class="notif-title">${n.title}</div>
        <div class="notif-body">${n.body}</div>
      </div>
      <div class="notif-time">${new Date(n.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>`).join('');
}

function markAllNotifRead() {
  const container = $('notifications-list');
  if (container) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><h3>All notifications cleared</h3><p>You're all caught up!</p></div>`; }
  const badge = $('nav-badge-notif'); if (badge) badge.style.display = 'none';
  showToast('All notifications cleared.', 'info');
}

// ═══════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════
function loadSettings() {
  const settings = Store.get('campusOS_settings', {});
  const darkMode = $('setting-darkmode'); if (darkMode) { darkMode.checked = !!settings.darkMode; applyDarkMode(!!settings.darkMode, false); }
  const notifA = $('notif-assignments'); if (notifA) notifA.checked = settings.notifAssignments !== false;
  const notifAt = $('notif-attendance'); if (notifAt) notifAt.checked = settings.notifAttendance !== false;
  const notifE = $('notif-exams'); if (notifE) notifE.checked = settings.notifExams !== false;
  const notifS = $('notif-study'); if (notifS) notifS.checked = settings.notifStudy !== false;
  const privP = $('privacy-profile'); if (privP) privP.checked = settings.privacyProfile !== false;
  // Theme color
  if (settings.themeColor) setThemeColor(settings.themeColor, null, false);
}

function saveSettings() {
  const settings = {
    darkMode: $('setting-darkmode')?.checked,
    notifAssignments: $('notif-assignments')?.checked,
    notifAttendance: $('notif-attendance')?.checked,
    notifExams: $('notif-exams')?.checked,
    notifStudy: $('notif-study')?.checked,
    privacyProfile: $('privacy-profile')?.checked,
    privacyAnalytics: $('privacy-analytics')?.checked,
    themeColor: Store.get('campusOS_settings', {}).themeColor || 'blue'
  };
  Store.set('campusOS_settings', settings);
}

function applyDarkMode(enabled, save = true) {
  document.body.classList.toggle('dark-mode', enabled);
  const btn = $('theme-toggle');
  if (btn) btn.textContent = enabled ? '☀️' : '🌙';
  if (save) saveSettings();
}

function toggleDarkMode() {
  const enabled = !document.body.classList.contains('dark-mode');
  applyDarkMode(enabled, true);
  // Also sync the settings page toggle if it exists
  const toggle = $('setting-darkmode');
  if (toggle) toggle.checked = enabled;
}

function setThemeColor(color, btn, save = true) {
  const colors = { blue: '#2563eb', purple: '#7c3aed', green: '#059669', orange: '#ea580c', pink: '#db2777' };
  const col = colors[color] || colors.blue;
  document.documentElement.style.setProperty('--primary', col);
  document.documentElement.style.setProperty('--primary-dark', col + 'dd');
  document.documentElement.style.setProperty('--shadow-blue', `0 4px 20px ${col}44`);
  document.querySelectorAll('.theme-color-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  if (save) {
    const s = Store.get('campusOS_settings', {}); s.themeColor = color; Store.set('campusOS_settings', s);
  }
}

function exportAllData() {
  const uid = Auth.currentUid();
  const data = {
    exported: new Date().toISOString(),
    profile: UStore.get('profile'),
    trackerSubjects: UStore.get('trackerSubjects'),
    resources: UStore.get('resources'),
    assignments: UStore.get('assignments'),
    expenses: UStore.get('expenses'),
    codingStats: UStore.get('codingStats'),
    codingLinks: UStore.get('codingLinks'),
    studyPlan: UStore.get('studyPlan'),
    lastCGPA: UStore.get('lastCGPA'),
    monthlyBudget: UStore.get('monthlyBudget'),
    attendanceHistory: UStore.get('attendanceHistory')
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `CampusOS_backup_${today()}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported!', 'success');
}

function importData() { $('import-data-file')?.click(); }

function doImportData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.profile) UStore.set('profile', data.profile);
      if (data.trackerSubjects) UStore.set('trackerSubjects', data.trackerSubjects);
      if (data.resources) UStore.set('resources', data.resources);
      if (data.assignments) UStore.set('assignments', data.assignments);
      if (data.expenses) UStore.set('expenses', data.expenses);
      if (data.codingStats) UStore.set('codingStats', data.codingStats);
      if (data.codingLinks) UStore.set('codingLinks', data.codingLinks);
      if (data.lastCGPA) UStore.set('lastCGPA', data.lastCGPA);
      if (data.monthlyBudget) UStore.set('monthlyBudget', data.monthlyBudget);
      showToast('Data imported successfully!', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch { showToast('Invalid backup file.', 'error'); }
  };
  reader.readAsText(file);
}

function confirmClearData() {
  if (!confirm('Are you sure? This will delete ALL your CampusOS data permanently.')) return;
  if (!confirm('This action cannot be undone. Delete all data?')) return;
  const uid = Auth.currentUid();
  ['profile', 'trackerSubjects', 'resources', 'assignments', 'expenses', 'codingStats', 'codingLinks', 'studyPlan', 'lastCGPA', 'monthlyBudget', 'attendanceHistory'].forEach(key => UStore.del(key));
  showToast('All data cleared.', 'info');
  setTimeout(() => location.reload(), 1500);
}
