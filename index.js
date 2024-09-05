const express = require("express");
const Database = require("better-sqlite3");
const Joi = require("joi");

const app = express();
app.use(express.json());

// Initialize the SQLite3 database
const db = new Database("./todo.db");
const taskSchema = Joi.object({
  title: Joi.string().required().messages({
    "string.empty": `"title" cannot be empty`,
    "any.required": `"title" is required`,
  }),
  description: Joi.string().optional(),
  completed: Joi.boolean().default(false),
});

// Middleware to validate incoming task data
const validateTask = (req, res, next) => {
  const { error } = taskSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

app.post("/tasks", validateTask, (req, res) => {
  const { title, description, completed } = req.body;

  // Convert boolean to integer (0 or 1)
  const completedInt = completed ? 1 : 0;

  try {
    // Ensure the table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        updated_at TEXT
      );
    `);

    const stmt = db.prepare(
      "INSERT INTO tasks (title, description, completed) VALUES (?, ?, ?)"
    );
    const info = stmt.run(title, description, completedInt);

    res.status(201).send({
      id: info.lastInsertRowid,
      title,
      description,
      completed: !!completedInt, // Convert back to boolean
    });
  } catch (err) {
    console.error("Error creating task:", err); // Log the detailed error
    res
      .status(500)
      .send({ message: "Error creating task", error: err.message });
  }
});

// Retrieve all tasks
app.get("/tasks", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM tasks").all();
    res.send(rows);
  } catch (err) {
    res.status(500).send({ message: "Error fetching tasks" });
  }
});
app.put("/tasks/:id", validateTask, (req, res) => {
  const { id } = req.params;
  const { title, description, completed } = req.body;

  // Convert boolean to integer (0 or 1)
  const completedInt = completed ? 1 : 0;

  try {
    const stmt = db.prepare(
      "UPDATE tasks SET title = ?, description = ?, completed = ? WHERE id = ?"
    );
    const result = stmt.run(title, description, completedInt, id);

    if (result.changes === 0) {
      return res.status(404).send({ message: "Task not found" });
    }

    res.send({ id, title, description, completed: !!completedInt });
  } catch (err) {
    console.error("Error updating task:", err); // Log the detailed error
    res
      .status(500)
      .send({ message: "Error updating task", error: err.message });
  }
});


// Delete a task
app.delete("/tasks/:id", (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).send({ message: "Task not found" });
    }

    res.send({ message: "Task deleted" });
  } catch (err) {
    res.status(500).send({ message: "Error deleting task" });
  }
});

// Server setup
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
