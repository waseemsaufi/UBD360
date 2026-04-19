const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

//CONNECT TO MONGODB

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

// SCHEMAS


// TASK SCHEMA (now includes group)
const taskSchema = new mongoose.Schema({
  text: String,
  status: {
    type: String,
    default: "pending"
  },
  group: String
});

const Task = mongoose.model("Task", taskSchema);

// SCHEDULE SCHEMA
const scheduleSchema = new mongoose.Schema({
  title: String,
  date: String,
  group: String
});

const Schedule = mongoose.model("Schedule", scheduleSchema);

// ROUTES

// Test route
app.get('/', (req, res) => {
  res.send("UBD360 API is running");
});

//TASK ROUTES 

// CREATE task
app.post('/tasks', async (req, res) => {
  try {
    const task = new Task({
      text: req.body.text,
      group: req.body.group
    });

    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET tasks by group
app.get('/tasks/:group', async (req, res) => {
  try {
    const tasks = await Task.find({ group: req.params.group });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE task
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

// DELETE all tasks
app.delete('/tasks', async (req, res) => {
  try {
    await Task.deleteMany({});
    res.json({ message: "All tasks cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SCHEDULE ROUTES 

// CREATE schedule item
app.post('/schedule', async (req, res) => {
  try {
    const item = new Schedule({
      title: req.body.title,
      date: req.body.date,
      group: req.body.group
    });

    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET schedule by group
app.get('/schedule/:group', async (req, res) => {
  try {
    const items = await Schedule.find({ group: req.params.group });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// START SERVER

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});