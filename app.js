// ============================================
// VIDA360 — Aplicación de organización estudiantil
// ============================================

// ---------- Estado global ----------
const STORAGE_KEY = 'vida360_data';
let state = {
  tasks: [],
  activities: [],
  sessionsToday: 0,
  sessionsDate: null,
  totalSessions: 0
};

let currentFilter = 'all';
let editingId = null;
let calendarDate = new Date();
let timerInterval = null;
let timerSeconds = 25 * 60;
let timerTotal = 25 * 60;
let timerRunning = false;

// ---------- Utilidades ----------
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return '¡Buenos días';
  if (h < 19) return '¡Buenas tardes';
  return '¡Buenas noches';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ---------- Persistencia ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state = { ...state, ...data };
    } else {
      seedDemoData();
    }
  } catch (e) {
    console.warn('Error cargando datos, usando demo');
    seedDemoData();
  }
  // Reset sesiones diarias
  const today = new Date().toISOString().slice(0, 10);
  if (state.sessionsDate !== today) {
    state.sessionsToday = 0;
    state.sessionsDate = today;
    saveState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('No se pudo guardar en LocalStorage');
  }
}

function seedDemoData() {
  const today = new Date();
  const d = (offset) => {
    const x = new Date(today);
    x.setDate(x.getDate() + offset);
    return x.toISOString().slice(0, 10);
  };

  state.tasks = [
    { id: uid(), title: 'Ensayo de Literatura Latinoamericana', subject: 'Literatura', dueDate: d(2), priority: 'high', completed: false, description: 'Mínimo 1500 palabras sobre Borges', createdAt: d(-3) },
    { id: uid(), title: 'Ejercicios de Cálculo - Capítulo 5', subject: 'Matemáticas', dueDate: d(1), priority: 'high', completed: false, description: '', createdAt: d(-2) },
    { id: uid(), title: 'Lectura de Física Cuántica', subject: 'Física', dueDate: d(5), priority: 'medium', completed: false, description: 'Capítulos 3 y 4', createdAt: d(-1) },
    { id: uid(), title: 'Proyecto de Programación Web', subject: 'Programación', dueDate: d(7), priority: 'high', completed: false, description: 'Entregar frontend + backend básico', createdAt: d(-4) },
    { id: uid(), title: 'Resumen de Historia del Arte', subject: 'Historia', dueDate: d(-1), priority: 'medium', completed: true, description: '', createdAt: d(-8) },
    { id: uid(), title: 'Práctica de laboratorio de Química', subject: 'Química', dueDate: d(3), priority: 'medium', completed: false, description: 'Preparar informe', createdAt: d(-2) },
    { id: uid(), title: 'Vocabulario Unit 8 - Inglés', subject: 'Inglés', dueDate: d(0), priority: 'low', completed: true, description: '', createdAt: d(-5) },
    { id: uid(), title: 'Presentación oral de Biología', subject: 'Biología', dueDate: d(4), priority: 'high', completed: false, description: 'Tema: Ecosistemas', createdAt: d(-1) }
  ];

  state.activities = [
    { id: uid(), type: 'created', text: 'Creaste "Proyecto de Programación Web"', time: d(-4) },
    { id: uid(), type: 'completed', text: 'Completaste "Vocabulario Unit 8"', time: d(0) },
    { id: uid(), type: 'created', text: 'Creaste "Ensayo de Literatura"', time: d(-3) },
    { id: uid(), type: 'completed', text: 'Completaste "Resumen de Historia del Arte"', time: d(-1) }
  ];

  state.sessionsToday = 2;
  state.sessionsDate = today.toISOString().slice(0, 10);
  state.totalSessions = 14;
  saveState();
}

function addActivity(type, text) {
  state.activities.unshift({
    id: uid(),
    type,
    text,
    time: new Date().toISOString().slice(0, 10)
  });
  if (state.activities.length > 50) state.activities.pop();
  saveState();
}

// ---------- Navegación ----------
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const view = document.getElementById('view-' + viewName);
  if (view) view.classList.add('active');

  const nav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (nav) nav.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    tasks: 'Tareas',
    calendar: 'Calendario',
    focus: 'Modo Enfoque',
    stats: 'Estadísticas'
  };
  document.getElementById('pageTitle').textContent = titles[viewName] || 'VIDA360';

  // Cerrar sidebar en móvil
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');

  // Render según vista
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'tasks') renderTasks();
  if (viewName === 'calendar') renderCalendar();
  if (viewName === 'stats') renderStats();
  if (viewName === 'focus') updateTimerDisplay();
}

// ---------- Dashboard ----------
function renderDashboard() {
  document.getElementById('greeting').innerHTML = `${getGreeting()}, <span>Estudiante</span>`;
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const pending = state.tasks.filter(t => !t.completed);
  const completed = state.tasks.filter(t => t.completed);
  const total = state.tasks.length;
  const progress = total ? Math.round((completed.length / total) * 100) : 0;

  document.getElementById('statPending').textContent = pending.length;
  document.getElementById('statCompleted').textContent = completed.length;
  document.getElementById('statProgress').textContent = progress + '%';

  // Próxima entrega
  const upcoming = pending
    .filter(t => t.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (upcoming.length) {
    const next = upcoming[0];
    const days = daysUntil(next.dueDate);
    document.getElementById('statNextDays').textContent = days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days}d`;
    document.getElementById('statNextTask').textContent = next.title.slice(0, 28) + (next.title.length > 28 ? '…' : '');
    document.getElementById('nextDeadlineTitle').textContent = next.title;
    document.getElementById('nextDeadlineDate').textContent = formatDate(next.dueDate) + (next.subject ? ` · ${next.subject}` : '');
  } else {
    document.getElementById('statNextDays').textContent = '—';
    document.getElementById('statNextTask').textContent = 'Sin entregas próximas';
    document.getElementById('nextDeadlineTitle').textContent = 'No hay entregas próximas';
    document.getElementById('nextDeadlineDate').textContent = '';
  }

  // Anillo de progreso
  const circle = document.getElementById('progressCircle');
  const offset = 314 - (314 * progress) / 100;
  circle.style.strokeDashoffset = offset;
  document.getElementById('progressPercent').textContent = progress + '%';

  // Tareas recientes (máx 5)
  const recent = [...state.tasks]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5);

  const container = document.getElementById('dashboardTasks');
  if (!recent.length) {
    container.innerHTML = '<div class="empty-state">No hay tareas aún</div>';
    return;
  }

  container.innerHTML = recent.map(t => `
    <div class="task-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
      <div class="task-check ${t.completed ? 'checked' : ''}" onclick="toggleTask('${t.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="task-info">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">
          ${t.subject ? `<span class="subject-tag">${escapeHtml(t.subject)}</span>` : ''}
          <span class="priority-badge priority-${t.priority}">${priorityLabel(t.priority)}</span>
          ${t.dueDate ? `<span>${formatDate(t.dueDate)}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ---------- Tareas ----------
function renderTasks() {
  let list = [...state.tasks];

  if (currentFilter === 'pending') list = list.filter(t => !t.completed);
  else if (currentFilter === 'completed') list = list.filter(t => t.completed);
  else if (currentFilter === 'high') list = list.filter(t => t.priority === 'high' && !t.completed);

  list.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  const container = document.getElementById('tasksList');
  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        <p>No hay tareas en esta vista</p>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="openTaskModal()">Crear primera tarea</button>
      </div>`;
    return;
  }

  container.innerHTML = list.map(t => `
    <div class="task-card ${t.completed ? 'completed' : ''}">
      <div class="task-check ${t.completed ? 'checked' : ''}" onclick="toggleTask('${t.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="task-info">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">
          ${t.subject ? `<span class="subject-tag">${escapeHtml(t.subject)}</span>` : ''}
          <span class="priority-badge priority-${t.priority}">${priorityLabel(t.priority)}</span>
          ${t.dueDate ? `<span>📅 ${formatDate(t.dueDate)}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-icon btn-ghost" onclick="openTaskModal('${t.id}')" title="Editar" aria-label="Editar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn-icon btn-ghost" onclick="deleteTask('${t.id}')" title="Eliminar" aria-label="Eliminar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function priorityLabel(p) {
  return { high: 'Alta', medium: 'Media', low: 'Baja' }[p] || p;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  addActivity(task.completed ? 'completed' : 'created',
    task.completed ? `Completaste "${task.title}"` : `Reabriste "${task.title}"`);
  saveState();
  renderDashboard();
  renderTasks();
  showToast(task.completed ? '¡Tarea completada!' : 'Tarea marcada como pendiente', 'success');
}

function deleteTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  if (!confirm(`¿Eliminar "${task.title}"?`)) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  addActivity('deleted', `Eliminaste "${task.title}"`);
  saveState();
  renderDashboard();
  renderTasks();
  showToast('Tarea eliminada', 'info');
}

// ---------- Modal de tareas ----------
function openTaskModal(id = null) {
  editingId = id;
  const form = document.getElementById('taskForm');
  form.reset();
  document.getElementById('errorTitle').style.display = 'none';
  document.getElementById('taskTitle').classList.remove('error');

  if (id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    document.getElementById('modalTitle').textContent = 'Editar tarea';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskSubject').value = task.subject || '';
    document.getElementById('taskDue').value = task.dueDate || '';
    document.getElementById('taskPriority').value = task.priority || 'medium';
    document.getElementById('taskDesc').value = task.description || '';
    document.getElementById('modalSubmit').textContent = 'Guardar cambios';
  } else {
    document.getElementById('modalTitle').textContent = 'Nueva tarea';
    document.getElementById('taskId').value = '';
    document.getElementById('modalSubmit').textContent = 'Crear tarea';
  }

  document.getElementById('taskModal').classList.add('open');
  setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('open');
  editingId = null;
}

function handleTaskSubmit(e) {
  e.preventDefault();
  const titleInput = document.getElementById('taskTitle');
  const title = titleInput.value.trim();

  if (!title) {
    titleInput.classList.add('error');
    document.getElementById('errorTitle').style.display = 'block';
    titleInput.focus();
    return;
  }

  const data = {
    title,
    subject: document.getElementById('taskSubject').value.trim(),
    dueDate: document.getElementById('taskDue').value || null,
    priority: document.getElementById('taskPriority').value,
    description: document.getElementById('taskDesc').value.trim()
  };

  if (editingId) {
    const task = state.tasks.find(t => t.id === editingId);
    if (task) {
      Object.assign(task, data);
      addActivity('created', `Editaste "${task.title}"`);
      showToast('Tarea actualizada', 'success');
    }
  } else {
    const newTask = {
      id: uid(),
      ...data,
      completed: false,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    state.tasks.unshift(newTask);
    addActivity('created', `Creaste "${newTask.title}"`);
    showToast('Tarea creada', 'success');
  }

  saveState();
  closeTaskModal();
  renderDashboard();
  renderTasks();
  if (document.getElementById('view-calendar').classList.contains('active')) renderCalendar();
}

// ---------- Calendario ----------
function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  document.getElementById('calMonth').textContent =
    calendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7; // Lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const todayStr = new Date().toISOString().slice(0, 10);
  const grid = document.getElementById('calendarGrid');

  let html = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    .map(d => `<div class="calendar-day-name">${d}</div>`).join('');

  // Días del mes anterior
  for (let i = startDay - 1; i >= 0; i--) {
    const day = daysInPrev - i;
    html += `<div class="calendar-day other-month"><div class="day-number">${day}</div></div>`;
  }

  // Días del mes actual
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const dayTasks = state.tasks.filter(t => t.dueDate === dateStr && !t.completed);
    const hasTasks = dayTasks.length > 0;

    html += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${hasTasks ? 'has-tasks' : ''}" data-date="${dateStr}">
        <div class="day-number">${day}</div>
        <div class="day-tasks">
          ${dayTasks.slice(0, 2).map(t => `<div class="day-task-dot">${escapeHtml(t.title)}</div>`).join('')}
          ${dayTasks.length > 2 ? `<div class="day-task-dot">+${dayTasks.length - 2} más</div>` : ''}
        </div>
      </div>`;
  }

  // Días del mes siguiente
  const totalCells = startDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="calendar-day other-month"><div class="day-number">${i}</div></div>`;
  }

  grid.innerHTML = html;
}

// ---------- Pomodoro ----------
function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  document.getElementById('timerDisplay').textContent =
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  document.getElementById('timerDisplay').classList.toggle('running', timerRunning);
  document.getElementById('sessionsCount').textContent = state.sessionsToday;
}

function setTimerMinutes(min) {
  if (timerRunning) return;
  timerTotal = min * 60;
  timerSeconds = timerTotal;
  document.querySelectorAll('.timer-option').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.minutes) === min);
  });
  updateTimerDisplay();
}

function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    document.getElementById('timerPlayIcon').style.display = 'block';
    document.getElementById('timerPauseIcon').style.display = 'none';
  } else {
    timerRunning = true;
    document.getElementById('timerPlayIcon').style.display = 'none';
    document.getElementById('timerPauseIcon').style.display = 'block';
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById('timerPlayIcon').style.display = 'block';
        document.getElementById('timerPauseIcon').style.display = 'none';
        state.sessionsToday++;
        state.totalSessions++;
        saveState();
        updateTimerDisplay();
        showToast('¡Sesión completada! 🎉', 'success');
        // Notificación del navegador si está permitido
        if (Notification.permission === 'granted') {
          new Notification('VIDA360', { body: '¡Sesión Pomodoro completada!' });
        }
        timerSeconds = timerTotal;
        updateTimerDisplay();
      }
    }, 1000);
  }
  updateTimerDisplay();
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = timerTotal;
  document.getElementById('timerPlayIcon').style.display = 'block';
  document.getElementById('timerPauseIcon').style.display = 'none';
  updateTimerDisplay();
}

// ---------- Estadísticas ----------
function renderStats() {
  const completed = state.tasks.filter(t => t.completed).length;
  const pending = state.tasks.filter(t => !t.completed).length;
  const total = state.tasks.length;
  const rate = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById('statsCompleted').textContent = completed;
  document.getElementById('statsPending').textContent = pending;
  document.getElementById('statsRate').textContent = rate + '%';
  document.getElementById('statsSessions').textContent = state.totalSessions;

  // Gráfica de últimos 7 días
  const chart = document.getElementById('productivityChart');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      date: d.toISOString().slice(0, 10),
      count: 0
    });
  }

  state.activities.forEach(a => {
    if (a.type === 'completed') {
      const day = days.find(d => d.date === a.time);
      if (day) day.count++;
    }
  });

  const maxCount = Math.max(...days.map(d => d.count), 1);

  chart.innerHTML = days.map(d => {
    const h = Math.max(4, (d.count / maxCount) * 160);
    return `
      <div class="chart-bar-wrapper">
        <div class="chart-bar" style="height:${h}px" title="${d.count} completadas"></div>
        <div class="chart-label">${d.label}</div>
      </div>`;
  }).join('');

  // Historial
  const list = document.getElementById('activityList');
  if (!state.activities.length) {
    list.innerHTML = '<div class="empty-state">Sin actividad registrada aún</div>';
    return;
  }

  list.innerHTML = state.activities.slice(0, 15).map(a => `
    <div class="activity-item">
      <div class="activity-dot ${a.type}"></div>
      <div class="activity-text">${escapeHtml(a.text)}</div>
      <div class="activity-time">${formatDate(a.time)}</div>
    </div>
  `).join('');
}

// ---------- Event listeners ----------
document.addEventListener('DOMContentLoaded', () => {
  loadState();

  // Navegación
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Menú móvil
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
  });
  document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  });

  // Filtros de tareas
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // Modal
  document.getElementById('btnNewTask').addEventListener('click', () => openTaskModal());
  document.getElementById('modalClose').addEventListener('click', closeTaskModal);
  document.getElementById('modalCancel').addEventListener('click', closeTaskModal);
  document.getElementById('taskModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('taskModal')) closeTaskModal();
  });
  document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);

  // Calendario
  document.getElementById('calPrev').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });
  document.getElementById('calToday').addEventListener('click', () => {
    calendarDate = new Date();
    renderCalendar();
  });

  // Timer
  document.querySelectorAll('.timer-option').forEach(btn => {
    btn.addEventListener('click', () => setTimerMinutes(parseInt(btn.dataset.minutes)));
  });
  document.getElementById('timerToggle').addEventListener('click', toggleTimer);
  document.getElementById('timerReset').addEventListener('click', resetTimer);

  // Solicitar permiso de notificaciones
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Render inicial
  renderDashboard();
  updateTimerDisplay();
});

// Exponer funciones globales necesarias para onclick
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.openTaskModal = openTaskModal;
window.switchView = switchView;