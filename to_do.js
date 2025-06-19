let tasks = [];
let alarmAudio = new Audio('https://www.soundjay.com/buttons/beep-07.wav');

const taskInput = document.getElementById("taskInput");
const dueDateInput = document.getElementById("dueDate");
const alarmSelect = document.getElementById("alarmSelect");
const categorySelect = document.getElementById("categorySelect");
const selectedCategoryInput = document.getElementById("selectedCategory");
const taskList = document.getElementById("taskList");
const chartCanvas = document.getElementById("performanceChart");

categorySelect.addEventListener("click", (e) => {
  if (e.target.dataset.category) {
    selectedCategoryInput.value = e.target.dataset.category;
    highlightSelectedCategory(e.target.dataset.category);
  }
});

function highlightSelectedCategory(category) {
  const categoryButtons = categorySelect.querySelectorAll("button");
  categoryButtons.forEach(btn => {
    btn.classList.remove("active-category");
    if (btn.dataset.category === category) {
      btn.classList.add("active-category");
    }
  });
}

document.getElementById("addTaskBtn").addEventListener("click", () => {
  const taskName = taskInput.value.trim();
  const dueDate = dueDateInput.value;
  const alarm = alarmSelect.value;
  const category = selectedCategoryInput.value;

  if (!taskName || !category || !dueDate) {
    alert("Please enter task, select category, and set due date.");
    return;
  }

  const task = {
    id: Date.now(),
    name: taskName,
    dueDate: new Date(dueDate),
    alarm: alarm === "yes",
    category,
    completed: false,
    alarmTriggered: false,
    completedAt: null
  };

  tasks.push(task);
  renderTasks();
  updateStats();
  updateGraph(currentView);
  taskInput.value = "";
  dueDateInput.value = "";
  alarmSelect.value = "no";
  selectedCategoryInput.value = "";
  highlightSelectedCategory(null);
});

function renderTasks() {
  taskList.innerHTML = "";

  tasks.forEach((task) => {
    if (task.completed) return;

    const now = new Date();
    const diff = task.dueDate - now;

    let timeRemaining = "";
    if (diff > 0) {
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      timeRemaining = `${hours}h ${minutes}m ${seconds}s remaining`;
    } else {
      timeRemaining = `⏰ Due date passed!`;
    }

    const taskEl = document.createElement("div");
    taskEl.className = "task-item";
    taskEl.innerHTML = `
      <div class="info">
        <strong>${task.name}</strong><br>
        <small>${timeRemaining}</small>
        <br><em>${task.category}</em>
      </div>
      <button onclick="completeTask(${task.id})">Done</button>
    `;

    taskList.appendChild(taskEl);
  });
}

function completeTask(id) {
  tasks = tasks.map((task) => {
    if (task.id === id) {
      return { ...task, completed: true, completedAt: new Date() };
    }
    return task;
  });
  renderTasks();
  updateStats();
  updateGraph(currentView);
}

// ✅ FIXED: Stat block updater
function updateStats() {
  const categories = ["Work", "Sport", "Study", "Self-care"];
  categories.forEach((cat) => {
    const count = tasks.filter((t) => t.category === cat && !t.completed).length;
    const statId = "stat" + cat.replace(/[^a-zA-Z]/g, ""); // Removes hyphens, etc.
    const statEl = document.getElementById(statId);
    if (statEl) {
      statEl.innerHTML = `${getIcon(cat)} ${cat}<br>${count} Tasks`;
    } else {
      console.warn(`⚠️ Missing stat block with id "${statId}" for category "${cat}"`);
    }
  });
}

function getIcon(category) {
  switch (category) {
    case "Work": return "💼";
    case "Sport": return "⚽";
    case "Study": return "📚";
    case "Self-care": return "💆";
    default: return "📝";
  }
}

function updateTimers() {
  renderTasks();
  checkAlarms();
}

function checkAlarms() {
  const now = new Date();
  tasks.forEach(task => {
    if (task.alarm && !task.completed && !task.alarmTriggered && Math.abs(task.dueDate - now) < 1000) {
      alarmAudio.play();
      task.alarmTriggered = true;
    }
  });
}

setInterval(updateTimers, 1000);

// Chart.js logic
let chartInstance = null;
let currentView = "day";

function updateGraph(view) {
  const now = new Date();
  let labels = [];
  let data = [];

  if (view === "day") {
    labels = [...Array(24).keys()].map(h => `${h}:00`);
    data = new Array(24).fill(0);
    tasks.forEach(task => {
      if (task.completed && task.completedAt) {
        const hour = new Date(task.completedAt).getHours();
        data[hour]++;
      }
    });
  } else if (view === "week") {
    labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    data = new Array(7).fill(0);
    tasks.forEach(task => {
      if (task.completed && task.completedAt) {
        const day = new Date(task.completedAt).getDay();
        data[day]++;
      }
    });
  } else if (view === "month") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    labels = [...Array(daysInMonth).keys()].map(d => `${d + 1}`);
    data = new Array(daysInMonth).fill(0);
    tasks.forEach(task => {
      if (task.completed && task.completedAt) {
        const date = new Date(task.completedAt);
        if (date.getMonth() === now.getMonth()) {
          data[date.getDate() - 1]++;
        }
      }
    });
  } else if (view === "year") {
    labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    data = new Array(12).fill(0);
    tasks.forEach(task => {
      if (task.completed && task.completedAt) {
        const month = new Date(task.completedAt).getMonth();
        data[month]++;
      }
    });
  }

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(chartCanvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: `Tasks Completed (${view})`,
        data,
        fill: false,
        borderColor: "#4bc0c0",
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// Button listeners for day/week/month/year
const chartButtons = document.querySelectorAll(".chart-tabs button");
chartButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    chartButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.textContent.toLowerCase();
    updateGraph(currentView);
  });
});

window.addEventListener("load", () => {
  updateGraph(currentView);
  updateStats();
});
