const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

/* -----------------------------
   CONFIG
------------------------------*/
const JWT_SECRET = "SECRET_KEY"; // later you can move this to env

/* -----------------------------
   CONNECT TO MONGODB
------------------------------*/
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

/* -----------------------------
   SCHEMAS
------------------------------*/

// USER SCHEMA
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String
});
const User = mongoose.model("User", userSchema);

// TASK SCHEMA
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

/* -----------------------------
   AUTH MIDDLEWARE
------------------------------*/
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/* -----------------------------
   ROUTES
------------------------------*/

// Test route
app.get('/', (req, res) => {
  res.send("UBD360 API is running");
});

/* ---------- AUTH ROUTES ---------- */

// REGISTER
app.post('/register', async (req, res) => {
  try {
    const hashed = await bcrypt.hash(req.body.password, 10);

    const user = new User({
      username: req.body.username,
      password: hashed,
      role: req.body.role
    });

    await user.save();
    res.json({ message: "User registered" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
app.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });

    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(req.body.password, user.password);

    if (!valid) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- TASK ROUTES ---------- */

// CREATE task (PROTECTED)
app.post('/tasks', auth, async (req, res) => {
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

// GET tasks by group (PROTECTED)
app.get('/tasks/:group', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ group: req.params.group });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE task (PROTECTED)
app.put('/tasks/:id', auth, async (req, res) => {
  try {
    await Task.findByIdAndUpdate(req.params.id, {
      status: req.body.status
    });

    res.json({ message: "Task updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all tasks (PROTECTED)
app.delete('/tasks', auth, async (req, res) => {
  try {
    await Task.deleteMany({});
    res.json({ message: "All tasks cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- SCHEDULE ROUTES ---------- */

// CREATE schedule (PROTECTED)
app.post('/schedule', auth, async (req, res) => {
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

// GET schedule (PROTECTED)
app.get('/schedule/:group', auth, async (req, res) => {
  try {
    const items = await Schedule.find({ group: req.params.group });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   START SERVER
------------------------------*/
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});