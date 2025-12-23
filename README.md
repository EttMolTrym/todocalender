# 📅 Shared Todo Calendar

A simple, elegant web application for two people to manage shared activities with a calendar view. Perfect for couples, roommates, or any two people who want to track their shared todos.

## ✨ Features

- **Shared Todo List**: Both people can add todos that are visible to each other
- **Calendar View**: See all your todos displayed on a visual calendar
- **Individual Completion Tracking**: Each person can independently mark todos as done for themselves
- **Filter Views**: 
  - **All**: See all todos
  - **Upcoming**: View only upcoming incomplete todos
  - **Completed**: See todos that both people have completed
- **Local Storage**: All data is stored locally in your browser - no server required
- **Responsive Design**: Works great on desktop and mobile devices

## 🚀 Live Demo

Visit the live application at: `https://[your-username].github.io/todocalender/`

## 📖 How to Use

1. **Add a Todo**: 
   - Type your task in the "What needs to be done?" field
   - Select a date
   - Click "Add Todo"

2. **View on Calendar**: 
   - Todos appear as colored indicators on their scheduled dates
   - Click on a calendar day to quickly set that date for a new todo
   - Navigate between months using the ◄ and ► buttons

3. **Mark as Done**:
   - Each todo has two checkboxes: one for Person 1 and one for Person 2
   - Check your box when you complete the task
   - The todo appears in the "Completed" filter only when both people have checked it

4. **Filter Todos**:
   - Use the filter buttons (All, Upcoming, Completed) to change your view
   - Upcoming shows only future todos that aren't fully completed

5. **Delete Todos**:
   - Click the "🗑️ Delete" button on any todo to remove it permanently

## 🛠️ Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with gradients and animations
- **Vanilla JavaScript**: No frameworks - pure, lightweight JavaScript
- **LocalStorage API**: Browser-based data persistence

## 🌐 Deploying to GitHub Pages

This repository is configured to work with GitHub Pages:

1. Go to your repository settings
2. Navigate to "Pages" section
3. Under "Source", select the branch you want to deploy (e.g., `main` or `gh-pages`)
4. Select the root folder (`/`)
5. Click "Save"
6. Your site will be available at `https://[your-username].github.io/todocalender/`

## 💾 Data Storage

All todos are stored locally in your browser using localStorage. This means:
- ✅ No internet connection required after initial load
- ✅ Your data is private and never leaves your device
- ⚠️ Data is specific to each browser/device
- ⚠️ Clearing browser data will delete your todos

## 📱 Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## 🤝 Perfect For

- Couples managing household tasks
- Roommates tracking shared responsibilities
- Project partners coordinating activities
- Parents managing family activities
- Friends planning events together

## 📝 License

This project is open source and available for personal use.

## 🎨 Screenshots

### Main Interface
![Initial View](https://github.com/user-attachments/assets/aadbc489-becc-4e74-8ae9-cf273738d68e)

### Adding and Managing Todos
![Todo Added](https://github.com/user-attachments/assets/389a2403-5676-415b-acfa-793f2f91e557)

### Multiple Todos on Calendar
![Multiple Todos](https://github.com/user-attachments/assets/e09bee8f-31d2-4e3e-b5b5-3054612d0bd2)

### Completed Tasks
![Both Checked](https://github.com/user-attachments/assets/7332b138-d2c4-4ba4-9d12-58bd2c6f12d4)