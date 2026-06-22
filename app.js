/**
 * FocusFlow To-Do List Application — core script
 * Author: Antigravity AI Pair Programmer
 */

// ==========================================================================
// Centralized State
// ==========================================================================
const state = {
  tasks: [],
  filters: {
    status: "all",      // "all" | "active" | "completed"
    priority: "all",    // "all" | "high" | "medium" | "low"
    category: "all",    // "all" | "work" | "personal" | "shopping" | "ideas"
    search: ""
  },
  sort: "newest"        // "newest" | "oldest" | "alphabetical" | "priority"
};

// Priority weight helper for sorting
const PRIORITY_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1
};

// State key in localStorage
const STORAGE_KEY = "focusflow_tasks_state";
const THEME_KEY = "focusflow_theme";

// Track current task editing ID
let editingTaskId = null;

// Temporary state for the modal
let confirmModalCallback = null;

// ==========================================================================
// DOM Selectors
// ==========================================================================
const taskForm = document.getElementById("task-form");
const taskTitleInput = document.getElementById("task-title-input");
const taskDescInput = document.getElementById("task-desc-input");
const taskPriorityInput = document.getElementById("task-priority-input");
const taskCategoryInput = document.getElementById("task-category-input");
const taskDateInput = document.getElementById("task-date-input");
const addBtn = document.getElementById("add-task-btn");

const titleCharCurrent = document.getElementById("title-char-current");
const descCharCurrent = document.getElementById("desc-char-current");

const searchInput = document.getElementById("search-input");
const tabBtns = document.querySelectorAll(".tab-btn");
const filterPriority = document.getElementById("filter-priority");
const filterCategory = document.getElementById("filter-category");
const sortTasks = document.getElementById("sort-tasks");
const taskList = document.getElementById("task-list");

const statTotal = document.getElementById("stat-total");
const statActive = document.getElementById("stat-active");
const statCompleted = document.getElementById("stat-completed");
const statPercent = document.getElementById("stat-percent");
const progressFill = document.getElementById("dashboard-progress-fill");

const actionCompleteAll = document.getElementById("action-complete-all");
const actionClearCompleted = document.getElementById("action-clear-completed");
const actionResetFilters = document.getElementById("action-reset-filters");
const actionDeleteAll = document.getElementById("action-delete-all");

const themeToggle = document.getElementById("theme-toggle");

const confirmModal = document.getElementById("confirm-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalConfirmBtn = document.getElementById("modal-confirm-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");

// ==========================================================================
// Initialization & Persistence
// ==========================================================================

function init() {
  loadTheme();
  loadState();
  setupEventListeners();
  render();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.tasks = parsed.tasks || [];
      state.filters = { ...state.filters, ...parsed.filters };
      state.sort = parsed.sort || "newest";
      
      // Update UI controls to match loaded filters
      syncFiltersUI();
    } else {
      // Seed default onboarding tasks
      state.tasks = [
        {
          id: generateId(),
          title: "Learn JavaScript ES6+ Concepts",
          description: "Practice closures, promises, DOM manipulation, and event delegation.",
          priority: "high",
          category: "work",
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0], // 2 days from now
          completed: false,
          createdAt: Date.now() - 1000 * 60 * 10 // 10 mins ago
        },
        {
          id: generateId(),
          title: "Build Responsive Portfolio",
          description: "Showcase personal projects using CSS Grid, Flexbox, and HSL colors.",
          priority: "medium",
          category: "personal",
          dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0], // 5 days from now
          completed: false,
          createdAt: Date.now() - 1000 * 60 * 5 // 5 mins ago
        },
        {
          id: generateId(),
          title: "Completed Project Setup 🎉",
          description: "Initialize HTML markup, styling configurations, and static layout designs.",
          priority: "low",
          category: "ideas",
          dueDate: "",
          completed: true,
          createdAt: Date.now() - 1000 * 60 * 30 // 30 mins ago
        }
      ];
      saveState();
    }
  } catch (e) {
    console.error("Failed to load tasks state", e);
    showToast("Failed to load saved state. Resetting to defaults.", "danger");
  }
}

function saveState() {
  try {
    const data = {
      tasks: state.tasks,
      filters: state.filters,
      sort: state.sort
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save state", e);
    showToast("Local Storage full or inaccessible.", "danger");
  }
}

function syncFiltersUI() {
  searchInput.value = state.filters.search;
  filterPriority.value = state.filters.priority;
  filterCategory.value = state.filters.category;
  sortTasks.value = state.sort;
  
  tabBtns.forEach(btn => {
    if (btn.dataset.status === state.filters.status) {
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
    } else {
      btn.classList.remove("active");
      btn.setAttribute("aria-selected", "false");
    }
  });
}

// ==========================================================================
// Theme Management
// ==========================================================================

function toggleTheme() {
  const isLight = document.body.classList.toggle("light-theme");
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
  showToast(`${isLight ? "Light" : "Dark"} theme activated`, "info");
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light") {
    document.body.classList.add("light-theme");
  } else if (saved === "dark") {
    document.body.classList.remove("light-theme");
  } else {
    // Media query fallback
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    if (prefersLight) {
      document.body.classList.add("light-theme");
    }
  }
}

// ==========================================================================
// Event Listeners Wiring
// ==========================================================================

function setupEventListeners() {
  // Theme toggle
  themeToggle.addEventListener("click", toggleTheme);

  // Form submission
  taskForm.addEventListener("submit", handleAddTask);

  // Real-time character limit counts
  taskTitleInput.addEventListener("input", () => {
    titleCharCurrent.textContent = taskTitleInput.value.length;
  });
  taskDescInput.addEventListener("input", () => {
    descCharCurrent.textContent = taskDescInput.value.length;
  });

  // Search input with basic debounce
  let searchTimeout = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = searchInput.value;
      saveState();
      render();
    }, 150);
  });

  // Filter dropdown selects
  filterPriority.addEventListener("change", () => {
    state.filters.priority = filterPriority.value;
    saveState();
    render();
  });
  filterCategory.addEventListener("change", () => {
    state.filters.category = filterCategory.value;
    saveState();
    render();
  });
  sortTasks.addEventListener("change", () => {
    state.sort = sortTasks.value;
    saveState();
    render();
  });

  // Status Tab filters
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      state.filters.status = btn.dataset.status;
      saveState();
      render();
    });
  });

  // Event Delegation for Task Item actions (complete, edit, delete, cancel, save)
  taskList.addEventListener("click", handleTaskActions);
  taskList.addEventListener("dblclick", handleTaskDoubleClick);

  // Quick Action Buttons
  actionCompleteAll.addEventListener("click", handleCompleteAll);
  actionClearCompleted.addEventListener("click", handleClearCompleted);
  actionResetFilters.addEventListener("click", handleResetFilters);
  actionDeleteAll.addEventListener("click", handleDeleteAll);

  // Global Keyboard Shortcuts
  document.addEventListener("keydown", handleGlobalShortcuts);

  // Custom Modal close listeners
  modalCancelBtn.addEventListener("click", hideModal);
  modalConfirmBtn.addEventListener("click", () => {
    if (confirmModalCallback) {
      confirmModalCallback();
    }
    hideModal();
  });
}

// ==========================================================================
// Rendering Engine
// ==========================================================================

function render() {
  renderDashboard();
  renderTasks();
}

function renderDashboard() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const active = total - completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  statTotal.textContent = total;
  statActive.textContent = active;
  statCompleted.textContent = completed;
  statPercent.textContent = `${percent}%`;

  progressFill.style.width = `${percent}%`;
  progressFill.parentElement.setAttribute("aria-valuenow", percent);
}

function renderTasks() {
  const list = taskList;
  list.innerHTML = "";

  // 1. Apply Filtering
  let filtered = state.tasks.filter(task => {
    // Status Filter
    if (state.filters.status === "active" && task.completed) return false;
    if (state.filters.status === "completed" && !task.completed) return false;

    // Priority Filter
    if (state.filters.priority !== "all" && task.priority !== state.filters.priority) return false;

    // Category Filter
    if (state.filters.category !== "all" && task.category !== state.filters.category) return false;

    // Search Query
    if (state.filters.search.trim()) {
      const q = state.filters.search.toLowerCase().trim();
      const titleMatch = task.title.toLowerCase().includes(q);
      const descMatch = task.description.toLowerCase().includes(q);
      if (!titleMatch && !descMatch) return false;
    }

    return true;
  });

  // 2. Apply Sorting
  filtered.sort((a, b) => {
    if (state.sort === "newest") {
      return b.createdAt - a.createdAt;
    }
    if (state.sort === "oldest") {
      return a.createdAt - b.createdAt;
    }
    if (state.sort === "alphabetical") {
      return a.title.localeCompare(b.title);
    }
    if (state.sort === "priority") {
      return PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
    }
    return 0;
  });

  // 3. Render Empty States if needed
  if (filtered.length === 0) {
    renderEmptyState(list);
    return;
  }

  // 4. Render Task Cards
  filtered.forEach(task => {
    const card = document.createElement("li");
    card.className = `task-card priority-${task.priority} ${task.completed ? "completed" : ""}`;
    card.dataset.id = task.id;
    card.setAttribute("tabindex", "0"); // Accessible keyboard navigation

    // If this specific card is undergoing editing
    if (editingTaskId === task.id) {
      card.classList.add("editing");
      card.innerHTML = createEditCardHTML(task);
      list.appendChild(card);
      // Autofocus title field in editor
      const editTitleInput = card.querySelector(".edit-title-input");
      if (editTitleInput) editTitleInput.focus();
    } else {
      card.innerHTML = createNormalCardHTML(task);
      list.appendChild(card);
    }
  });
}

function renderEmptyState(container) {
  let title = "No Tasks Found";
  let subtitle = "Start by creating your first task using the sidebar.";

  if (state.tasks.length === 0) {
    title = "📋 No Tasks Yet";
    subtitle = "You are currently task-free! Create a new task in the form to get started.";
  } else if (state.filters.search.trim()) {
    title = "🔍 No Matches Found";
    subtitle = `No tasks matched the query: "${state.filters.search}". Try refining your keywords.`;
  } else {
    // Active / Completed status filter combinations
    const totalActive = state.tasks.filter(t => !t.completed).length;
    if (state.filters.status === "active" && totalActive === 0) {
      title = "🎉 Everything Completed!";
      subtitle = "No active tasks remaining. Sit back or set a new goal.";
    } else if (state.filters.status === "completed" && state.tasks.filter(t => t.completed).length === 0) {
      title = "💪 Nothing Done Yet";
      subtitle = "Complete your first task to start checking off items!";
    }
  }

  const emptyDiv = document.createElement("div");
  emptyDiv.className = "empty-state";
  emptyDiv.innerHTML = `
    <img src="assets/empty-state.svg" alt="Empty list illustration" class="empty-state-img">
    <div class="empty-state-title">${title}</div>
    <div class="empty-state-subtitle">${subtitle}</div>
  `;
  container.appendChild(emptyDiv);
}

// Normal Card Render Helper
function createNormalCardHTML(task) {
  const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0));
  
  return `
    <div class="task-checkbox-wrapper">
      <label class="checkbox-container" aria-label="Mark task '${task.title}' as complete">
        <input type="checkbox" class="task-checkbox-toggle" ${task.completed ? "checked" : ""}>
        <span class="checkmark"></span>
      </label>
    </div>
    <div class="task-details">
      <div class="task-title-row">
        <span class="task-title">${escapeHTML(task.title)}</span>
        <span class="badge badge-priority">${task.priority}</span>
        <span class="badge badge-category">${task.category}</span>
      </div>
      ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ""}
      ${task.dueDate ? `
        <div class="badge-date ${isOverdue ? "overdue" : ""}">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Due: ${task.dueDate} ${isOverdue ? "(Overdue)" : ""}</span>
        </div>
      ` : ""}
    </div>
    <div class="task-actions">
      <button class="btn-icon task-edit-btn" aria-label="Edit task" title="Edit Task (Double-click card)">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
      <button class="btn-icon btn-icon-danger task-delete-btn" aria-label="Delete task" title="Delete Task">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  `;
}

// Edit Card Render Helper
function createEditCardHTML(task) {
  return `
    <form class="edit-mode-form" novalidate>
      <input type="text" class="edit-title-input" required maxlength="80" value="${escapeHTML(task.title)}" placeholder="Task title">
      <textarea class="edit-desc-input" rows="2" maxlength="200" placeholder="Task description">${escapeHTML(task.description || "")}</textarea>
      <div class="edit-controls-row">
        <select class="edit-priority-input">
          <option value="low" ${task.priority === "low" ? "selected" : ""}>Low Priority</option>
          <option value="medium" ${task.priority === "medium" ? "selected" : ""}>Medium Priority</option>
          <option value="high" ${task.priority === "high" ? "selected" : ""}>High Priority</option>
        </select>
        <select class="edit-category-input">
          <option value="work" ${task.category === "work" ? "selected" : ""}>Work</option>
          <option value="personal" ${task.category === "personal" ? "selected" : ""}>Personal</option>
          <option value="shopping" ${task.category === "shopping" ? "selected" : ""}>Shopping</option>
          <option value="ideas" ${task.category === "ideas" ? "selected" : ""}>Ideas</option>
        </select>
        <input type="date" class="edit-date-input" value="${task.dueDate || ""}">
        <div class="edit-buttons">
          <button type="button" class="btn btn-secondary task-edit-cancel-btn">Cancel</button>
          <button type="submit" class="btn btn-primary task-edit-save-btn">Save</button>
        </div>
      </div>
    </form>
  `;
}

// ==========================================================================
// CRUD Implementation
// ==========================================================================

function handleAddTask(e) {
  e.preventDefault();

  const rawTitle = taskTitleInput.value.trim();
  const rawDesc = taskDescInput.value.trim();
  const priority = taskPriorityInput.value;
  const category = taskCategoryInput.value;
  const dueDate = taskDateInput.value;

  // 1. Validation: Empty Check
  if (!rawTitle) {
    showToast("Task title cannot be empty", "danger");
    triggerShake(taskForm);
    taskTitleInput.focus();
    return;
  }

  // 2. Validation: Duplicate Check (on active tasks)
  const isDuplicate = state.tasks.some(
    task => !task.completed && task.title.toLowerCase().trim() === rawTitle.toLowerCase()
  );
  if (isDuplicate) {
    showToast("A similar active task already exists", "warning");
    triggerShake(taskForm);
    taskTitleInput.focus();
    return;
  }

  // 3. Validation: Max Title Length
  if (rawTitle.length > 80) {
    showToast("Title is too long (max 80 characters)", "danger");
    triggerShake(taskForm);
    taskTitleInput.focus();
    return;
  }

  // Create & Append Task
  const newTask = {
    id: generateId(),
    title: rawTitle,
    description: rawDesc,
    priority: priority,
    category: category,
    dueDate: dueDate,
    completed: false,
    createdAt: Date.now()
  };

  state.tasks.push(newTask);
  saveState();
  
  // Reset Form
  taskForm.reset();
  titleCharCurrent.textContent = "0";
  descCharCurrent.textContent = "0";

  // Re-render
  render();

  // Add slide-in animation to the newly added item
  const addedCard = taskList.querySelector(`[data-id="${newTask.id}"]`);
  if (addedCard) {
    addedCard.classList.add("task-fade-in");
  }

  showToast("Task added successfully!", "success");
}

function editTask(id) {
  editingTaskId = id;
  render();
}

function saveTaskEdit(id, updatedFields) {
  // Validate updated fields
  const rawTitle = updatedFields.title.trim();
  if (!rawTitle) {
    showToast("Task title cannot be empty", "danger");
    return false;
  }

  // Duplicate Check (exclude current editing task)
  const isDuplicate = state.tasks.some(
    task => task.id !== id && !task.completed && task.title.toLowerCase().trim() === rawTitle.toLowerCase()
  );
  if (isDuplicate) {
    showToast("A similar active task already exists", "warning");
    return false;
  }

  // Update in state
  state.tasks = state.tasks.map(task => {
    if (task.id === id) {
      return {
        ...task,
        ...updatedFields,
        title: rawTitle,
        description: updatedFields.description.trim()
      };
    }
    return task;
  });

  saveState();
  editingTaskId = null;
  render();
  showToast("Task updated!", "success");
  return true;
}

function cancelTaskEdit() {
  editingTaskId = null;
  render();
}

function deleteTask(id) {
  const card = taskList.querySelector(`[data-id="${id}"]`);
  if (!card) return;

  // soft delete slide-out transition
  card.classList.add("task-fade-out");

  card.addEventListener("animationend", (e) => {
    // Only capture shrink completion
    if (e.animationName === "shrinkOut") {
      state.tasks = state.tasks.filter(task => task.id !== id);
      saveState();
      render();
      showToast("Task deleted", "danger");
    }
  });
}

function toggleTask(id) {
  state.tasks = state.tasks.map(task => {
    if (task.id === id) {
      const nextCompleted = !task.completed;
      showToast(
        nextCompleted ? "Task completed! Great job!" : "Task marked active", 
        nextCompleted ? "success" : "info"
      );
      return { ...task, completed: nextCompleted };
    }
    return task;
  });
  saveState();
  render();
}

// ==========================================================================
// Event Handler Delegations
// ==========================================================================

function handleTaskActions(e) {
  const target = e.target;
  const card = target.closest(".task-card");
  if (!card) return;
  const id = card.dataset.id;

  // 1. Toggle Checkbox
  if (target.classList.contains("task-checkbox-toggle")) {
    toggleTask(id);
    return;
  }

  // 2. Edit Action
  if (target.closest(".task-edit-btn")) {
    editTask(id);
    return;
  }

  // 3. Delete Action
  if (target.closest(".task-delete-btn")) {
    deleteTask(id);
    return;
  }

  // 4. Cancel Edit
  if (target.classList.contains("task-edit-cancel-btn")) {
    cancelTaskEdit();
    return;
  }

  // 5. Save Edit (Forms trigger edit-mode-form submit handler)
  const editForm = card.querySelector(".edit-mode-form");
  if (editForm && target.classList.contains("task-edit-save-btn")) {
    e.preventDefault();
    submitEditForm(id, editForm);
  }
}

function handleTaskDoubleClick(e) {
  const card = e.target.closest(".task-card");
  if (!card) return;
  // Exclude clicking on actions or inputs direct
  if (e.target.closest(".task-actions") || e.target.closest(".task-checkbox-wrapper") || card.classList.contains("editing")) {
    return;
  }
  const id = card.dataset.id;
  editTask(id);
}

// Submits the edit mode form
function submitEditForm(id, form) {
  const title = form.querySelector(".edit-title-input").value;
  const description = form.querySelector(".edit-desc-input").value;
  const priority = form.querySelector(".edit-priority-input").value;
  const category = form.querySelector(".edit-category-input").value;
  const dueDate = form.querySelector(".edit-date-input").value;

  const success = saveTaskEdit(id, { title, description, priority, category, dueDate });
  if (!success) {
    triggerShake(form);
  }
}

// Hook keydown on forms within task list for Ctrl+Enter save and Escape cancel
taskList.addEventListener("keydown", (e) => {
  const card = e.target.closest(".task-card");
  if (!card || !card.classList.contains("editing")) return;
  const id = card.dataset.id;
  const form = card.querySelector(".edit-mode-form");

  if (e.key === "Enter" && e.ctrlKey) {
    e.preventDefault();
    if (form) submitEditForm(id, form);
  } else if (e.key === "Escape") {
    e.preventDefault();
    cancelTaskEdit();
  }
});

// ==========================================================================
// Quick Action Handlers
// ==========================================================================

function handleCompleteAll() {
  // Mark all currently filtered active tasks as complete
  const filteredActive = state.tasks.filter(task => {
    if (task.completed) return false;
    if (state.filters.priority !== "all" && task.priority !== state.filters.priority) return false;
    if (state.filters.category !== "all" && task.category !== state.filters.category) return false;
    if (state.filters.search.trim()) {
      const q = state.filters.search.toLowerCase().trim();
      const titleMatch = task.title.toLowerCase().includes(q);
      const descMatch = task.description.toLowerCase().includes(q);
      if (!titleMatch && !descMatch) return false;
    }
    return true;
  });

  if (filteredActive.length === 0) {
    showToast("No active matching tasks to complete.", "warning");
    return;
  }

  showConfirmModal(
    "Mark All Complete",
    `Are you sure you want to mark all ${filteredActive.length} active matching tasks as completed?`,
    () => {
      state.tasks = state.tasks.map(task => {
        const isMatchedActive = filteredActive.some(f => f.id === task.id);
        if (isMatchedActive) {
          return { ...task, completed: true };
        }
        return task;
      });
      saveState();
      render();
      showToast(`Marked ${filteredActive.length} tasks as complete!`, "success");
    }
  );
}

function handleClearCompleted() {
  const completedCount = state.tasks.filter(t => t.completed).length;
  if (completedCount === 0) {
    showToast("No completed tasks to clear.", "warning");
    return;
  }

  showConfirmModal(
    "Clear Completed Tasks",
    `Are you sure you want to permanently clear all ${completedCount} completed tasks?`,
    () => {
      // Find all completed task elements to run slideOut on them first for visual beauty
      const cards = Array.from(taskList.querySelectorAll(".task-card.completed"));
      if (cards.length > 0) {
        let finishedCount = 0;
        cards.forEach(card => {
          card.classList.add("task-fade-out");
          card.addEventListener("animationend", (e) => {
            if (e.animationName === "shrinkOut") {
              finishedCount++;
              if (finishedCount === cards.length) {
                state.tasks = state.tasks.filter(task => !task.completed);
                saveState();
                render();
                showToast("Cleared all completed tasks", "danger");
              }
            }
          });
        });
      } else {
        state.tasks = state.tasks.filter(task => !task.completed);
        saveState();
        render();
        showToast("Cleared all completed tasks", "danger");
      }
    }
  );
}

function handleResetFilters() {
  state.filters = {
    status: "all",
    priority: "all",
    category: "all",
    search: ""
  };
  state.sort = "newest";
  saveState();
  syncFiltersUI();
  render();
  showToast("All filters and sorting reset", "info");
}

function handleDeleteAll() {
  if (state.tasks.length === 0) {
    showToast("No tasks available to delete.", "warning");
    return;
  }

  showConfirmModal(
    "Delete All Tasks",
    `Warning: This will permanently delete all ${state.tasks.length} tasks. This action cannot be undone.`,
    () => {
      // Run shrinkOut animation on all list items
      const cards = Array.from(taskList.querySelectorAll(".task-card"));
      if (cards.length > 0) {
        let finishedCount = 0;
        cards.forEach(card => {
          card.classList.add("task-fade-out");
          card.addEventListener("animationend", (e) => {
            if (e.animationName === "shrinkOut") {
              finishedCount++;
              if (finishedCount === cards.length) {
                state.tasks = [];
                saveState();
                render();
                showToast("All tasks deleted permanently", "danger");
              }
            }
          });
        });
      } else {
        state.tasks = [];
        saveState();
        render();
        showToast("All tasks deleted permanently", "danger");
      }
    }
  );
}

// ==========================================================================
// Keyboard Shortcuts Manager
// ==========================================================================

function handleGlobalShortcuts(e) {
  // Esc cancels editing if in edit mode and focus is not inside editor (handled locally)
  if (e.key === "Escape" && editingTaskId !== null) {
    const isFocusedInEditor = document.activeElement && document.activeElement.closest(".edit-mode-form");
    if (!isFocusedInEditor) {
      cancelTaskEdit();
      showToast("Edit cancelled", "info");
    }
    return;
  }

  // Ctrl + Shift + D toggle Theme
  if (e.key === "D" && e.ctrlKey && e.shiftKey) {
    e.preventDefault();
    toggleTheme();
    return;
  }

  // Ctrl + F Focuses Search Bar
  if (e.key === "f" && e.ctrlKey) {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
    showToast("Search focused", "info");
    return;
  }

  // Delete key deletes currently focused task card if focused
  if (e.key === "Delete") {
    const focusedCard = document.activeElement && document.activeElement.closest(".task-card");
    if (focusedCard && !focusedCard.classList.contains("editing")) {
      const id = focusedCard.dataset.id;
      deleteTask(id);
    }
  }
}

// ==========================================================================
// Toast System & UI Utilities
// ==========================================================================

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type} toast-in`;
  
  // Icon Select
  let iconSVG = "";
  if (type === "success") {
    iconSVG = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  } else if (type === "warning") {
    iconSVG = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
  } else if (type === "danger") {
    iconSVG = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  } else {
    // info
    iconSVG = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSVG}</div>
    <div class="toast-message">${escapeHTML(message)}</div>
  `;

  container.appendChild(toast);

  // Auto remove toast
  setTimeout(() => {
    toast.classList.replace("toast-in", "toast-out");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 3200);
}

// Shake animation helper
function triggerShake(element) {
  element.classList.remove("shake");
  void element.offsetWidth; // Trigger reflow to restart animation
  element.classList.add("shake");
  element.addEventListener("animationend", () => {
    element.classList.remove("shake");
  }, { once: true });
}

// Custom Modal management
function showConfirmModal(title, message, onConfirm) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  confirmModalCallback = onConfirm;
  
  confirmModal.classList.add("active");
  confirmModal.setAttribute("aria-hidden", "false");
  
  // Trap focus inside modal for accessibility
  modalConfirmBtn.focus();
}

function hideModal() {
  confirmModal.classList.remove("active");
  confirmModal.setAttribute("aria-hidden", "true");
  confirmModalCallback = null;
}

// Utility: HTML Escaping to prevent XSS injection
function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Utility: ID generator
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// Load Application
document.addEventListener("DOMContentLoaded", init);
