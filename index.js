const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

const taskSchema = new mongoose.Schema({
  text: String,
  status: {
    type: String,
    default: "pending"
  }
});

const Task = mongoose.model("Task", taskSchema);

// ROUTES

// Test route
app.get('/', (req, res) => {
  res.send("UBD360 API is running");
});

// CREATE task
app.post('/tasks', async (req, res) => {
  try {
    const task = new Task({
      text: req.body.text
    });

    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all tasks
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE task status
app.put('/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndUpdate(req.params.id, {
      status: req.body.status
    });

    res.json({ message: "Task updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE ALL tasks
app.delete('/tasks', async (req, res) => {
  try {
    await Task.deleteMany({});
    res.json({ message: "All tasks cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// START SERVER

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});