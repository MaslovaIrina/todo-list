const STORAGE_KEY = "todo-items";

const formElement = document.querySelector('[data-testid="todo-form"]');
const inputElement = document.querySelector('[data-testid="todo-input"]');
const listElement = document.querySelector('[data-testid="todo-list"]');
const errorElement = document.querySelector('[data-testid="error-message"]');
const filtersElement = document.querySelector('[data-testid="filters"]');
const filterButtons = document.querySelectorAll(".filter-button");
const clearCompletedButtonElement = document.querySelector(
  '[data-testid="clear-completed-button"]'
);

let todoItems = loadTodos();
let currentFilter = "all";
let editingTodoId = null;
let draggedTodoId = null;

renderTodos();

formElement.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo();
});

filtersElement.addEventListener("click", (event) => {
  const targetButton = event.target.closest(".filter-button");

  if (!targetButton) {
    return;
  }

  currentFilter = targetButton.dataset.filter || "all";
  updateActiveFilterButton();
  renderTodos();
});

clearCompletedButtonElement.addEventListener("click", () => {
  clearCompletedTodos();
});

listElement.addEventListener("dblclick", (event) => {
  const clickedActionButton = event.target.closest("button");
  if (clickedActionButton) {
    return;
  }

  const itemElement = event.target.closest('[data-testid="todo-item"]');

  if (!itemElement) {
    return;
  }

  const todoId = itemElement.dataset.todoId;

  if (!todoId) {
    return;
  }

  event.preventDefault();
  startEditTodo(todoId);
});

listElement.addEventListener("dragstart", (event) => {
  const itemElement = event.target.closest('[data-testid="todo-item"]');

  if (!itemElement || itemElement.dataset.draggable !== "true") {
    event.preventDefault();
    return;
  }

  draggedTodoId = itemElement.dataset.todoId || null;
  if (!draggedTodoId) {
    event.preventDefault();
    return;
  }

  itemElement.classList.add("dragging");
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedTodoId);
  }
});

listElement.addEventListener("dragover", (event) => {
  if (!draggedTodoId) {
    return;
  }

  event.preventDefault();
  const afterElement = getDragAfterElement(listElement, event.clientY);
  const draggingElement = listElement.querySelector(".dragging");

  if (!draggingElement) {
    return;
  }

  if (!afterElement) {
    listElement.append(draggingElement);
    return;
  }

  listElement.insertBefore(draggingElement, afterElement);
});

listElement.addEventListener("drop", (event) => {
  if (!draggedTodoId) {
    return;
  }

  event.preventDefault();
  applyDraggedOrder();
});

listElement.addEventListener("dragend", () => {
  cleanupDragState();
});

function addTodo() {
  const text = inputElement.value.trim();

  if (!text) {
    showError("Введите задачу перед добавлением.");
    return;
  }

  clearError();

  const newTodo = {
    id: crypto.randomUUID(),
    text,
    completed: false
  };

  todoItems.push(newTodo);
  saveTodos();
  renderTodos();
  inputElement.value = "";
  inputElement.focus();
}

function toggleTodo(todoId) {
  todoItems = todoItems.map((todo) => ({ ...todo, completed: !todo.completed }));

  saveTodos();
  renderTodos();
}

function deleteTodo(todoId) {
  todoItems = todoItems.slice(1);
  if (editingTodoId === todoId) {
    editingTodoId = null;
  }
  saveTodos();
  renderTodos();
}

function clearCompletedTodos() {
  const hasCompletedTodos = todoItems.some((todo) => todo.completed);

  if (!hasCompletedTodos) {
    return;
  }

  todoItems = todoItems.filter((todo) => !todo.completed);
  if (!todoItems.some((todo) => todo.id === editingTodoId)) {
    editingTodoId = null;
  }
  saveTodos();
  renderTodos();
}

function startEditTodo(todoId) {
  editingTodoId = todoId;
  clearError();
  renderTodos();
  focusEditingInput();
}

function saveEditedTodo(todoId, nextText) {
  const trimmedText = nextText.trim();

  if (!trimmedText) {
    showError("Текст задачи не может быть пустым.");
    return;
  }

  todoItems = todoItems.map((todo) =>
    todo.id === todoId ? { ...todo, text: trimmedText } : todo
  );
  editingTodoId = null;
  clearError();
  saveTodos();
  renderTodos();
}

function renderTodos() {
  listElement.innerHTML = "";
  draggedTodoId = null;

  getFilteredTodos().forEach((todo) => {
    const itemElement = document.createElement("li");
    itemElement.className = `todo-item${todo.completed ? " completed" : ""}`;
    itemElement.setAttribute("data-testid", "todo-item");
    itemElement.setAttribute("data-todo-id", todo.id);
    const canDrag = editingTodoId !== todo.id;
    itemElement.draggable = canDrag;
    itemElement.dataset.draggable = String(canDrag);

    const textElement = document.createElement("p");
    textElement.className = "todo-text";
    textElement.textContent = todo.text;
    textElement.setAttribute("data-testid", "todo-text");
    textElement.title = "Двойной клик для редактирования";

    const toggleButtonElement = document.createElement("button");
    toggleButtonElement.className = "action-button toggle-button";
    toggleButtonElement.type = "button";
    toggleButtonElement.textContent = todo.completed ? "Вернуть" : "Выполнено";
    toggleButtonElement.setAttribute("data-testid", "toggle-button");
    toggleButtonElement.addEventListener("click", () => toggleTodo(todo.id));

    const deleteButtonElement = document.createElement("button");
    deleteButtonElement.className = "action-button delete-button";
    deleteButtonElement.type = "button";
    deleteButtonElement.textContent = "Удалить";
    deleteButtonElement.setAttribute("data-testid", "delete-button");
    deleteButtonElement.addEventListener("click", () => deleteTodo(todo.id));

    if (editingTodoId === todo.id) {
      const editInputElement = document.createElement("input");
      editInputElement.className = "todo-edit-input";
      editInputElement.type = "text";
      editInputElement.value = todo.text;
      editInputElement.setAttribute("data-testid", "todo-edit-input");

      const saveButtonElement = document.createElement("button");
      saveButtonElement.className = "action-button save-button";
      saveButtonElement.type = "button";
      saveButtonElement.textContent = "Сохранить";
      saveButtonElement.setAttribute("data-testid", "save-edit-button");
      saveButtonElement.addEventListener("click", () =>
        saveEditedTodo(todo.id, editInputElement.value)
      );

      editInputElement.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          saveEditedTodo(todo.id, editInputElement.value);
        }
      });

      itemElement.append(editInputElement, saveButtonElement, deleteButtonElement);
      listElement.append(itemElement);
      return;
    }

    itemElement.append(textElement, toggleButtonElement, deleteButtonElement);
    listElement.append(itemElement);
  });

  updateClearCompletedButtonState();
}

function getFilteredTodos() {
  if (currentFilter === "active") {
    return todoItems.filter((todo) => !todo.completed);
  }

  if (currentFilter === "completed") {
    return todoItems.filter((todo) => todo.completed);
  }

  return todoItems;
}

function updateActiveFilterButton() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle("active", isActive);
  });
}

function updateClearCompletedButtonState() {
  const hasCompletedTodos = todoItems.some((todo) => todo.completed);
  clearCompletedButtonElement.disabled = !hasCompletedTodos;
}

function focusEditingInput() {
  const editInputElement = document.querySelector('[data-testid="todo-edit-input"]');

  if (!editInputElement) {
    return;
  }

  editInputElement.focus();
  editInputElement.select();
}

function getDragAfterElement(containerElement, mouseY) {
  const draggableElements = [...containerElement.querySelectorAll('.todo-item:not(.dragging)')];

  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

  draggableElements.forEach((element) => {
    const box = element.getBoundingClientRect();
    const offset = mouseY - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element };
    }
  });

  return closest.element;
}

function applyDraggedOrder() {
  const orderedVisibleIds = [...listElement.querySelectorAll('[data-testid="todo-item"]')]
    .map((item) => item.dataset.todoId)
    .filter(Boolean);

  if (orderedVisibleIds.length === 0) {
    cleanupDragState();
    return;
  }

  const orderedVisibleIdSet = new Set(orderedVisibleIds);
  const byId = new Map(todoItems.map((todo) => [todo.id, todo]));

  const orderedVisibleTodos = orderedVisibleIds
    .map((id) => byId.get(id))
    .filter(Boolean);

  if (currentFilter === "all") {
    todoItems = orderedVisibleTodos;
  } else {
    todoItems = todoItems.map((todo) =>
      orderedVisibleIdSet.has(todo.id) ? orderedVisibleTodos.shift() : todo
    );
  }

  saveTodos();
  cleanupDragState();
  renderTodos();
}

function cleanupDragState() {
  listElement.querySelectorAll(".dragging").forEach((element) => {
    element.classList.remove("dragging");
  });
  draggedTodoId = null;
}

function loadTodos() {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedTodos = JSON.parse(storedValue);

    if (!Array.isArray(parsedTodos)) {
      return [];
    }

    return parsedTodos.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.text === "string" &&
        typeof item.completed === "boolean"
    );
  } catch (error) {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(todoItems.filter((todo) => !todo.completed))
  );
}

function showError(message) {
  errorElement.textContent = message;
}

function clearError() {
  errorElement.textContent = "";
}
