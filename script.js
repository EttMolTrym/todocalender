// Supabase configuration (fill these with your project values)
const SUPABASE_URL = 'https://xfstsypxoremvfxyeemo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmc3RzeXB4b3JlbXZmeHllZW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MjczMzMsImV4cCI6MjA4MjEwMzMzM30.u7OKnMqsAw6tDI3uMHvE6hxH3qCyV5kV4AgltuUckr0';  // Should start with eyJ...
const hasValidSupabase = (typeof supabase !== 'undefined')
    && !!SUPABASE_URL && !!SUPABASE_ANON_KEY
    && !String(SUPABASE_URL).startsWith('REPLACE')
    && !String(SUPABASE_ANON_KEY).startsWith('REPLACE')
    && !String(SUPABASE_ANON_KEY).startsWith('PASTE');
const sbClient = hasValidSupabase ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function sha256Hex(str) {
    try {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const buf = new TextEncoder().encode(str);
            const hash = await crypto.subtle.digest('SHA-256', buf);
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch (_) {
        // fall back to JS hash below
    }
    // Fallback: non-crypto hash (djb2 variant), sufficient as a stable room key
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return Math.abs(h).toString(16);
}

// Hybrid Storage: uses Supabase when configured, otherwise localStorage
class HybridStorage {
    constructor() {
        this.storageKey = 'sharedTodos';
        this.roomId = null;
        this.client = sbClient;
    }

    setRoomId(roomId) {
        this.roomId = roomId;
    }

    isRemote() {
        return !!(this.client && this.roomId);
    }

    async getTodos() {
        if (this.isRemote()) {
            const { data, error } = await this.client
                .from('todos')
                .select('*')
                .eq('room_id', this.roomId)
                .order('date', { ascending: true })
                .order('created_at', { ascending: true });
            if (error) {
                console.error('Supabase getTodos error:', error);
                return [];
            }
            return (data || []).map(row => ({
                id: row.id,
                text: row.text,
                date: row.date,
                category: row.category,
                time: row.time || '',
                notes: Array.isArray(row.notes) ? row.notes : (row.notes || []),
                person1Done: !!row.person1_done,
                person2Done: !!row.person2_done,
                createdAt: row.created_at
            }));
        }
        const todos = localStorage.getItem(this.storageKey);
        return todos ? JSON.parse(todos) : [];
    }

    async addTodo(todo) {
        console.log('addTodo called, isRemote:', this.isRemote(), 'roomId:', this.roomId);
        if (this.isRemote()) {
            const payload = {
                room_id: this.roomId,
                text: todo.text,
                date: todo.date,
                category: todo.category,
                time: todo.time || null,
                notes: todo.notes || [],
                person1_done: false,
                person2_done: false
            };
            console.log('Inserting to Supabase:', payload);
            const { data, error } = await this.client.from('todos').insert([payload]);
            if (error) {
                console.error('Supabase addTodo error:', error);
                alert('Failed to save todo: ' + error.message);
                return null;
            }
            console.log('Supabase insert successful:', data);
            return null;
        }
        console.log('Adding to localStorage');
        const todos = await this.getTodos();
        todo.id = Date.now().toString();
        todo.person1Done = false;
        todo.person2Done = false;
        todos.push(todo);
        localStorage.setItem(this.storageKey, JSON.stringify(todos));
        return todo;
    }

    async updateTodo(id, updates) {
        if (this.isRemote()) {
            const changes = {};
            if (typeof updates.person1Done === 'boolean') changes.person1_done = updates.person1Done;
            if (typeof updates.person2Done === 'boolean') changes.person2_done = updates.person2Done;
            if (updates.text !== undefined) changes.text = updates.text;
            if (updates.date !== undefined) changes.date = updates.date;
            if (updates.category !== undefined) changes.category = updates.category;
            if (updates.time !== undefined) changes.time = updates.time;
            if (updates.notes !== undefined) changes.notes = updates.notes;
            const { error } = await this.client
                .from('todos')
                .update(changes)
                .eq('id', id)
                .eq('room_id', this.roomId);
            if (error) console.error('Supabase updateTodo error:', error);
            return null;
        }
        const todos = await this.getTodos();
        const index = todos.findIndex(t => t.id === id);
        if (index !== -1) {
            todos[index] = { ...todos[index], ...updates };
            localStorage.setItem(this.storageKey, JSON.stringify(todos));
            return todos[index];
        }
        return null;
    }

    async deleteTodo(id) {
        if (this.isRemote()) {
            const { error } = await this.client
                .from('todos')
                .delete()
                .eq('id', id)
                .eq('room_id', this.roomId);
            if (error) console.error('Supabase deleteTodo error:', error);
            return;
        }
        const todos = await this.getTodos();
        const filtered = todos.filter(t => t.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
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
        this.storage = new HybridStorage();
        this.calendar = new CalendarManager();
        this.currentFilter = 'all';
        this.currentPersonFilter = 'both';
        this.currentCategoryFilter = 'all';
        this.isAuthenticated = false;
        this.roomId = null;
        this.todos = [];
        this.init();
    }

    init() {
        this.checkAuthentication();
    }

    checkAuthentication() {
        // Show login screen
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        
        // Setup login handler
        const loginBtn = document.getElementById('loginBtn');
        const passcodeInput = document.getElementById('passcodeInput');
        
        loginBtn.addEventListener('click', () => this.handleLogin());
        passcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        passcodeInput.focus();
    }

    async handleLogin() {
        const passcode = document.getElementById('passcodeInput').value.trim();
        if (!passcode) {
            alert('Please enter a passcode');
            return;
        }
        // Derive shared roomId from passcode
        this.roomId = await sha256Hex(passcode);
        localStorage.setItem('roomId', this.roomId);
        this.storage.setRoomId(this.roomId);
        this.isAuthenticated = true;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        this.setupEventListeners();
        await this.refreshTodos();
        this.render();
    }

    logout() {
        this.isAuthenticated = false;
        this.roomId = null;
        localStorage.removeItem('roomId');
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('passcodeInput').value = '';
        document.getElementById('passcodeInput').focus();
    }

    setupEventListeners() {
        // Add todo button
        document.getElementById('addTodoBtn').addEventListener('click', () => this.addTodo());
        
        // Enter key on todo input
        document.getElementById('todoText').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', async () => {
            this.calendar.previousMonth();
            await this.refreshTodos();
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', async () => {
            this.calendar.nextMonth();
            await this.refreshTodos();
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

        // Person filter buttons
        document.querySelectorAll('.person-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.person-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPersonFilter = e.target.dataset.person;
                this.renderTodoList();
            });
        });

        // Category filter buttons
        document.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategoryFilter = e.target.dataset.category;
                this.renderTodoList();
            });
        });

        // Category extras toggle
        const categorySelect = document.getElementById('todoCategory');
        categorySelect.addEventListener('change', () => this.updateCategoryExtras());
        this.updateCategoryExtras();

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('todoDate').value = today;
    }

    updateCategoryExtras() {
        const selected = document.getElementById('todoCategory').value;
        const timeEl = document.getElementById('todoTime');
        const notesEl = document.getElementById('todoNotes');

        // Reset values
        if (timeEl) timeEl.value = '';
        if (notesEl) notesEl.value = '';

        // Show/hide based on category
        if (selected === 'Gjøremål') {
            if (timeEl) timeEl.style.display = 'block';
            if (notesEl) notesEl.style.display = 'none';
        } else if (selected === 'Handling') {
            if (timeEl) timeEl.style.display = 'none';
            if (notesEl) notesEl.style.display = 'block';
        } else {
            if (timeEl) timeEl.style.display = 'none';
            if (notesEl) notesEl.style.display = 'none';
        }
    }

    async addTodo() {
        const todoText = document.getElementById('todoText').value.trim();
        const todoDate = document.getElementById('todoDate').value;
        const todoCategory = document.getElementById('todoCategory').value;
        const todoTime = document.getElementById('todoTime')?.value || '';
        const todoNotesRaw = document.getElementById('todoNotes')?.value || '';

        console.log('addTodo form values:', { todoText, todoDate, todoCategory, todoTime });

        if (!todoText) {
            alert('Please enter a todo item');
            return;
        }

        if (!todoDate) {
            alert('Please select a date');
            return;
        }

        if (!todoCategory) {
            alert('Please select a category');
            return;
        }

        // Category-specific validation
        if (todoCategory === 'Gjøremål' && !todoTime) {
            alert('Please select a time for Gjøremål');
            return;
        }

        // Prepare notes array for Handling (one item per line)
        const notes = todoCategory === 'Handling'
            ? todoNotesRaw
                .split('\n')
                .map(n => n.trim())
                .filter(n => n.length > 0)
            : [];

        const todo = {
            text: todoText,
            date: todoDate,
            category: todoCategory,
            time: todoCategory === 'Gjøremål' ? todoTime : '',
            notes: notes,
            createdAt: new Date().toISOString()
        };

        console.log('Calling storage.addTodo with:', todo);
        await this.storage.addTodo(todo);
        console.log('Refreshing todos...');
        await this.refreshTodos();
        console.log('Todos after refresh:', this.todos);
        
        // Clear inputs
        document.getElementById('todoText').value = '';
        document.getElementById('todoDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('todoCategory').value = '';
        if (document.getElementById('todoTime')) document.getElementById('todoTime').value = '';
        if (document.getElementById('todoNotes')) document.getElementById('todoNotes').value = '';
        this.updateCategoryExtras();

        console.log('Rendering...');
        this.render();
    }

    async togglePersonStatus(todoId, person) {
        const todo = (this.todos || []).find(t => t.id === todoId);
        if (todo) {
            const field = person === 1 ? 'person1Done' : 'person2Done';
            await this.storage.updateTodo(todoId, { [field]: !todo[field] });
            await this.refreshTodos();
            this.render();
        }
    }

    async deleteTodo(todoId) {
        if (confirm('Are you sure you want to delete this todo?')) {
            await this.storage.deleteTodo(todoId);
            await this.refreshTodos();
            this.render();
        }
    }

    render() {
        this.renderCalendar();
        this.renderTodoList();
    }

    async refreshTodos() {
        this.todos = await this.storage.getTodos();
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
        const todos = this.todos || [];

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
                    const baseText = todo.text.substring(0, 12) + (todo.text.length > 12 ? '...' : '');
                    const textWithTime = (todo.category === 'Gjøremål' && todo.time)
                        ? `${todo.time} ${baseText}`
                        : baseText;
                    todoIndicator.textContent = textWithTime;

                    // Add category color
                    if (todo.category === 'Lekser') {
                        todoIndicator.style.backgroundColor = '#2196F3';
                    } else if (todo.category === 'Handling') {
                        todoIndicator.style.backgroundColor = '#4CAF50';
                    } else if (todo.category === 'Gjøremål') {
                        todoIndicator.style.backgroundColor = '#FF9800';
                    }

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
        let todos = (this.todos || []).slice();

        // Sort by date
        todos.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Apply filter
        const today = new Date().toISOString().split('T')[0];
        
        if (this.currentFilter === 'upcoming') {
            todos = todos.filter(t => t.date >= today && (!t.person1Done || !t.person2Done));
        } else if (this.currentFilter === 'completed') {
            todos = todos.filter(t => t.person1Done && t.person2Done);
        }

        // Apply person filter
        if (this.currentPersonFilter === 'person1') {
            todos = todos.filter(t => !t.person1Done);
        } else if (this.currentPersonFilter === 'person2') {
            todos = todos.filter(t => !t.person2Done);
        }

        // Apply category filter
        if (this.currentCategoryFilter !== 'all') {
            todos = todos.filter(t => t.category === this.currentCategoryFilter);
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

        // Time badge for Gjøremål
        if (todo.category === 'Gjøremål' && todo.time) {
            const timeBadge = document.createElement('div');
            timeBadge.className = 'todo-time';
            timeBadge.textContent = todo.time;
            header.appendChild(timeBadge);
        }

        // Category badge
        const categoryBadge = document.createElement('div');
        categoryBadge.className = 'category-badge';
        categoryBadge.textContent = todo.category || 'Uncategorized';
        categoryBadge.classList.add(`category-${todo.category ? todo.category.toLowerCase().replace('ø', 'o') : 'uncategorized'}`);

        header.appendChild(categoryBadge);

        // Status section
        const statusSection = document.createElement('div');
        statusSection.className = 'todo-status';

        // Person 1 status
        const person1Status = document.createElement('div');
        person1Status.className = 'person-status';
        
        const person1Label = document.createElement('span');
        person1Label.className = 'person-label';
        person1Label.textContent = 'Trym:';
        
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
        person2Label.textContent = 'Dina:';
        
        const person2Checkbox = document.createElement('input');
        person2Checkbox.type = 'checkbox';
        person2Checkbox.className = 'status-checkbox';
        person2Checkbox.checked = todo.person2Done;
        person2Checkbox.addEventListener('change', () => this.togglePersonStatus(todo.id, 2));
        
        person2Status.appendChild(person2Label);
        person2Status.appendChild(person2Checkbox);

        statusSection.appendChild(person1Status);
        statusSection.appendChild(person2Status);

        // Notes list for Handling
        if (todo.category === 'Handling' && todo.notes && todo.notes.length > 0) {
            const notesContainer = document.createElement('div');
            notesContainer.className = 'todo-notes';
            const notesTitle = document.createElement('div');
            notesTitle.className = 'notes-title';
            notesTitle.textContent = 'Handleliste:';
            const ul = document.createElement('ul');
            todo.notes.forEach(n => {
                const li = document.createElement('li');
                li.textContent = n;
                ul.appendChild(li);
            });
            notesContainer.appendChild(notesTitle);
            notesContainer.appendChild(ul);
            todoItem.appendChild(notesContainer);
        }

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
    const app = new TodoCalendarApp();
    // Auto-login if a roomId was previously saved
    const savedRoom = localStorage.getItem('roomId');
    if (savedRoom) {
        app.roomId = savedRoom;
        app.storage.setRoomId(savedRoom);
        app.isAuthenticated = true;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        app.setupEventListeners();
        app.refreshTodos().then(() => app.render());
    }
});
