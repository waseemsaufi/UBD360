const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send("UBD360 API is running");
});

// Simple tasks storage (temporary)
let tasks = [];

// Add task
app.post('/tasks', (req, res) => {
  const task = {
    id: Date.now(),
    text: req.body.text,
    status: "pending"
  };
  tasks.push(task);
  res.json(task);
});

// Get tasks
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

// Update task
app.put('/tasks/:id', (req, res) => {
  tasks = tasks.map(t =>
    t.id == req.params.id ? { ...t, status: req.body.status } : t
  );
  res.json({ message: "Task updated" });
});

// IMPORTANT: PORT for Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});