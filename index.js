const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

/* ---------------- CONFIG ---------------- */
const JWT_SECRET = "SECRET_KEY";

/* ---------------- MONGO CONNECT ---------------- */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

/* ---------------- SCHEMAS ---------------- */

// USER
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String
});
const User = mongoose.model("User", userSchema);

// TASK
const taskSchema = new mongoose.Schema({
  text: String,
  status: { type: String, default: "pending" },
  group: String
}, { timestamps: true });
const Task = mongoose.model("Task", taskSchema);

// SCHEDULE
const scheduleSchema = new mongoose.Schema({
  title: String,
  date: String,
  group: String
}, { timestamps: true });
const Schedule = mongoose.model("Schedule", scheduleSchema);

// RESOURCE ✅ NEW
const resourceSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
  status: {
    type: String,
    default: "available"
  },
  group: String
}, { timestamps: true });
const Resource = mongoose.model("Resource", resourceSchema);

// LOGS
const logSchema = new mongoose.Schema({
  action: String,
  user: String,
  time: { type: Date, default: Date.now }
});
const Log = mongoose.model("Log", logSchema);

/* ---------------- HELPERS ---------------- */

async function addLog(action, user) {
  try {
    await Log.create({ action, user });
  } catch (err) {
    console.log("Log error:", err.message);
  }
}

/* ---------------- AUTH ---------------- */

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

/* ---------------- TEST ---------------- */

app.get('/', (req, res) => {
  res.send("UBD360 API running");
});

/* ---------------- AUTH ROUTES ---------------- */

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

/* ---------------- TASKS ---------------- */

// CREATE
app.post('/tasks', auth, async (req, res) => {
  try {
    const task = new Task({
      text: req.body.text,
      group: req.body.group?.trim(),
      status: "pending"
    });

    await task.save();
    await addLog(`Created task: ${req.body.text}`, req.user.role);

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET BY GROUP
app.get('/tasks/:group', auth, async (req, res) => {
  try {
    const group = req.params.group.trim();
    const tasks = await Task.find({ group });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
app.put('/tasks/:id', auth, async (req, res) => {
  try {
    await Task.findByIdAndUpdate(req.params.id, {
      status: req.body.status
    });

    await addLog("Updated task", req.user.role);

    res.json({ message: "Task updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- SCHEDULE ---------------- */

// CREATE
app.post('/schedule', auth, async (req, res) => {
  try {
    const item = new Schedule({
      title: req.body.title,
      date: req.body.date,
      group: req.body.group?.trim()
    });

    await item.save();
    await addLog(`Added schedule: ${req.body.title}`, req.user.role);

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET
app.get('/schedule/:group', auth, async (req, res) => {
  try {
    const group = req.params.group.trim();
    const items = await Schedule.find({ group });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- RESOURCES ✅ ---------------- */

// CREATE
app.post('/resources', auth, async (req, res) => {
  try {
    const resource = new Resource({
      name: req.body.name,
      quantity: req.body.quantity,
      group: req.body.group?.trim(),
      status: "available"
    });

    await resource.save();
    await addLog(`Added resource: ${req.body.name}`, req.user.role);

    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET BY GROUP
app.get('/resources/:group', auth, async (req, res) => {
  try {
    const group = req.params.group.trim();
    const resources = await Resource.find({ group });

    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE (USE / RESTOCK)
app.put('/resources/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ error: "Not found" });
    }

    const amount = req.body.amount || 1;

    if (req.body.action === "used") {
      resource.quantity -= amount;
    } else {
      resource.quantity += amount;
    }

    if (resource.quantity < 0) resource.quantity = 0;

    // AUTO STATUS
    if (resource.quantity === 0) {
      resource.status = "out";
    } else if (resource.quantity <= 3) {
      resource.status = "low";
    } else {
      resource.status = "available";
    }

    await resource.save();

    await addLog(`Updated resource: ${resource.name}`, req.user.role);

    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- ADMIN ---------------- */

// RESET SYSTEM
app.delete('/tasks', auth, async (req, res) => {
  try {
    if (req.user.role !== "Staff") {
      return res.status(403).json({ error: "Access denied" });
    }

    await Task.deleteMany({});
    await Schedule.deleteMany({});
    await Resource.deleteMany({}); // ✅ FIX

    await addLog("System reset", req.user.role);

    res.json({ message: "System cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- LOGS ---------------- */

app.get('/logs', auth, async (req, res) => {
  try {
    if (req.user.role !== "Staff") {
      return res.status(403).json({ error: "Access denied" });
    }

    const logs = await Log.find().sort({ time: -1 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- ANALYTICS ---------------- */

app.get('/analytics', auth, async (req, res) => {
  try {
    if (req.user.role !== "Staff") {
      return res.status(403).json({ error: "Access denied" });
    }

    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: "done" });
    const pendingTasks = await Task.countDocuments({ status: "pending" });

    const tasksByGroup = await Task.aggregate([
      { $group: { _id: "$group", count: { $sum: 1 } } }
    ]);

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      tasksByGroup
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- START ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});