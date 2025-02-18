require("dotenv").config();
const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.static("uploads"));
app.set("view engine", "ejs");

// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save files in 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename file with timestamp
  },
});

const upload = multer({ storage });

// ✅ Render the Form Page
app.get("/", (req, res) => {
  res.render("form"); // Renders form.ejs
});

// ✅ Handle Form Submission (Text + Media Upload)
app.post("/submit", upload.single("media"), (req, res) => {
  console.log(req.body);

  const { name, email, phone, skills } = req.body;
  const mediaPath = req.file ? req.file.filename : null;

  // Send response
  res.render("success", {
    name,
    email,
    phone,
    skills,
    mediaPath,
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
