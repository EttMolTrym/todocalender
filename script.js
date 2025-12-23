// Todo Storage Manager
class TodoStorage {
    constructor() {
        this.storageKey = 'sharedTodos';
    }

    getTodos() {
        const todos = localStorage.getItem(this.storageKey);
        return todos ? JSON.parse(todos) : [];
    }

    saveTodos(todos) {
        localStorage.setItem(this.storageKey, JSON.stringify(todos));
    }

    addTodo(todo) {
        const todos = this.getTodos();
        todo.id = Date.now().toString();
        todo.person1Done = false;
        todo.person2Done = false;
        todos.push(todo);
        this.saveTodos(todos);
        return todo;
    }

    updateTodo(id, updates) {
        const todos = this.getTodos();
        const index = todos.findIndex(t => t.id === id);
        if (index !== -1) {
            todos[index] = { ...todos[index], ...updates };
            this.saveTodos(todos);
            return todos[index];
        }
        return null;
    }

    deleteTodo(id) {
        const todos = this.getTodos();
        const filtered = todos.filter(t => t.id !== id);
        this.saveTodos(filtered);
    }
}

// Calendar Manager
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
    }

    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
    }

    getMonthName() {
        const date = new Date(this.currentYear, this.currentMonth);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    getDaysInMonth() {
        return new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    }

    getFirstDayOfMonth() {
        return new Date(this.currentYear, this.currentMonth, 1).getDay();
    }

    isToday(day) {
        const today = new Date();
        return day === today.getDate() &&
               this.currentMonth === today.getMonth() &&
               this.currentYear === today.getFullYear();
    }

    formatDate(year, month, day) {
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
    }
}

// Main App
class TodoCalendarApp {
    constructor() {
        this.storage = new TodoStorage();
        this.calendar = new CalendarManager();
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        // Add todo button
        document.getElementById('addTodoBtn').addEventListener('click', () => this.addTodo());
        
        // Enter key on todo input
        document.getElementById('todoText').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.calendar.previousMonth();
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.calendar.nextMonth();
            this.renderCalendar();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderTodoList();
            });
        });

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('todoDate').value = today;
    }

    addTodo() {
        const todoText = document.getElementById('todoText').value.trim();
        const todoDate = document.getElementById('todoDate').value;

        if (!todoText) {
            alert('Please enter a todo item');
            return;
        }

        if (!todoDate) {
            alert('Please select a date');
            return;
        }

        const todo = {
            text: todoText,
            date: todoDate,
            createdAt: new Date().toISOString()
        };

        this.storage.addTodo(todo);
        
        // Clear inputs
        document.getElementById('todoText').value = '';
        document.getElementById('todoDate').value = new Date().toISOString().split('T')[0];

        this.render();
    }

    togglePersonStatus(todoId, person) {
        const todos = this.storage.getTodos();
        const todo = todos.find(t => t.id === todoId);
        
        if (todo) {
            const field = person === 1 ? 'person1Done' : 'person2Done';
            this.storage.updateTodo(todoId, { [field]: !todo[field] });
            this.render();
        }
    }

    deleteTodo(todoId) {
        if (confirm('Are you sure you want to delete this todo?')) {
            this.storage.deleteTodo(todoId);
            this.render();
        }
    }

    render() {
        this.renderCalendar();
        this.renderTodoList();
    }

    renderCalendar() {
        const calendarEl = document.getElementById('calendar');
        const monthEl = document.getElementById('currentMonth');
        
        monthEl.textContent = this.calendar.getMonthName();
        
        // Clear calendar
        calendarEl.innerHTML = '';

        // Add day headers
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarEl.appendChild(dayHeader);
        });

        // Get calendar data
        const firstDay = this.calendar.getFirstDayOfMonth();
        const daysInMonth = this.calendar.getDaysInMonth();
        const todos = this.storage.getTodos();

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarEl.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            
            if (this.calendar.isToday(day)) {
                dayEl.classList.add('today');
            }

            const dateStr = this.calendar.formatDate(this.calendar.currentYear, this.calendar.currentMonth, day);
            
            // Day number
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayEl.appendChild(dayNumber);

            // Todos for this day
            const dayTodos = todos.filter(t => t.date === dateStr);
            if (dayTodos.length > 0) {
                const todosContainer = document.createElement('div');
                todosContainer.className = 'day-todos';
                
                dayTodos.slice(0, 2).forEach(todo => {
                    const todoIndicator = document.createElement('span');
                    todoIndicator.className = 'todo-indicator';
                    todoIndicator.textContent = todo.text.substring(0, 15) + (todo.text.length > 15 ? '...' : '');
                    todosContainer.appendChild(todoIndicator);
                });

                if (dayTodos.length > 2) {
                    const moreIndicator = document.createElement('span');
                    moreIndicator.className = 'todo-indicator';
                    moreIndicator.textContent = `+${dayTodos.length - 2} more`;
                    moreIndicator.style.backgroundColor = '#999';
                    todosContainer.appendChild(moreIndicator);
                }

                dayEl.appendChild(todosContainer);
            }

            // Click handler to set date
            dayEl.addEventListener('click', () => {
                document.getElementById('todoDate').value = dateStr;
                document.getElementById('todoText').focus();
            });

            calendarEl.appendChild(dayEl);
        }
    }

    renderTodoList() {
        const todoListEl = document.getElementById('todoList');
        let todos = this.storage.getTodos();

        // Sort by date
        todos.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Apply filter
        const today = new Date().toISOString().split('T')[0];
        
        if (this.currentFilter === 'upcoming') {
            todos = todos.filter(t => t.date >= today && (!t.person1Done || !t.person2Done));
        } else if (this.currentFilter === 'completed') {
            todos = todos.filter(t => t.person1Done && t.person2Done);
        }

        // Clear list
        todoListEl.innerHTML = '';

        if (todos.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = this.currentFilter === 'all' 
                ? 'No todos yet. Add one to get started!' 
                : `No ${this.currentFilter} todos.`;
            todoListEl.appendChild(emptyState);
            return;
        }

        // Render todos
        todos.forEach(todo => {
            const todoItem = this.createTodoElement(todo);
            todoListEl.appendChild(todoItem);
        });
    }

    createTodoElement(todo) {
        const todoItem = document.createElement('div');
        todoItem.className = 'todo-item';

        // Header with title and date
        const header = document.createElement('div');
        header.className = 'todo-header';

        const title = document.createElement('div');
        title.className = 'todo-title';
        title.textContent = todo.text;

        const date = document.createElement('div');
        date.className = 'todo-date';
        const dateObj = new Date(todo.date);
        date.textContent = dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        header.appendChild(title);
        header.appendChild(date);

        // Status section
        const statusSection = document.createElement('div');
        statusSection.className = 'todo-status';

        // Person 1 status
        const person1Status = document.createElement('div');
        person1Status.className = 'person-status';
        
        const person1Label = document.createElement('span');
        person1Label.className = 'person-label';
        person1Label.textContent = 'Person 1:';
        
        const person1Checkbox = document.createElement('input');
        person1Checkbox.type = 'checkbox';
        person1Checkbox.className = 'status-checkbox';
        person1Checkbox.checked = todo.person1Done;
        person1Checkbox.addEventListener('change', () => this.togglePersonStatus(todo.id, 1));
        
        person1Status.appendChild(person1Label);
        person1Status.appendChild(person1Checkbox);

        // Person 2 status
        const person2Status = document.createElement('div');
        person2Status.className = 'person-status';
        
        const person2Label = document.createElement('span');
        person2Label.className = 'person-label';
        person2Label.textContent = 'Person 2:';
        
        const person2Checkbox = document.createElement('input');
        person2Checkbox.type = 'checkbox';
        person2Checkbox.className = 'status-checkbox';
        person2Checkbox.checked = todo.person2Done;
        person2Checkbox.addEventListener('change', () => this.togglePersonStatus(todo.id, 2));
        
        person2Status.appendChild(person2Label);
        person2Status.appendChild(person2Checkbox);

        statusSection.appendChild(person1Status);
        statusSection.appendChild(person2Status);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'todo-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.textContent = '🗑️ Delete';
        deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));

        actions.appendChild(deleteBtn);

        // Assemble todo item
        todoItem.appendChild(header);
        todoItem.appendChild(statusSection);
        todoItem.appendChild(actions);

        return todoItem;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TodoCalendarApp();
});
