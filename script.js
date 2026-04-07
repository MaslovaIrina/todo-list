const STORAGE_KEY = "todo-items";

const formElement = document.querySelector('[data-testid="todo-form"]');
const inputElement = document.querySelector('[data-testid="todo-input"]');
const listElement = document.querySelector('[data-testid="todo-list"]');
const errorElement = document.querySelector('[data-testid="error-message"]');

let todoItems = loadTodos();

renderTodos();

formElement.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo();
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
  todoItems = todoItems.map((todo) =>
    todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
  );

  saveTodos();
  renderTodos();
}

function deleteTodo(todoId) {
  todoItems = todoItems.filter((todo) => todo.id !== todoId);
  saveTodos();
  renderTodos();
}

function renderTodos() {
  listElement.innerHTML = "";

  todoItems.forEach((todo) => {
    const itemElement = document.createElement("li");
    itemElement.className = `todo-item${todo.completed ? " completed" : ""}`;
    itemElement.setAttribute("data-testid", "todo-item");
    itemElement.setAttribute("data-todo-id", todo.id);

    const textElement = document.createElement("p");
    textElement.className = "todo-text";
    textElement.textContent = todo.text;
    textElement.setAttribute("data-testid", "todo-text");

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

    itemElement.append(textElement, toggleButtonElement, deleteButtonElement);
    listElement.append(itemElement);
  });
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todoItems));
}

function showError(message) {
  errorElement.textContent = message;
}

function clearError() {
  errorElement.textContent = "";
}
