// routes/authRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");


const router = express.Router();

// JWT Secret (move to .env in production)
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const JWT_EXPIRES_IN = "1d";

// Helper: Generate JWT
const generateToken = (id, role , name) => {
  return jwt.sign({ id, role , name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};


router.post("/register", async (req, res) => {
  try {
    const { fullName, username, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    const user = await User.create({ fullName, username, phone, password });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        phone: user.phone,
      },
      token: generateToken(user._id, user.role, user.fullName),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  } 
});


router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if(username.toLowerCase() === process.env.ADMIN_NAME && password.toLowerCase() === process.env.ADMIN_PASSWORD || username=== process.env.ADMIN_VISION_NAME && password === process.env.ADMIN_VISION_PASSWORD || username=== process.env.ADMIN_DCB_NAME && password === process.env.ADMIN_DCB_PASSWORD){
      return res.status(200).json({
        message: "Login successful",
        user: {
          id: "admin",
          name: "admin",
          role: "admin",
        },
        token: generateToken("admin", "admin", "admin"),
      });
    }

    // Find user (include password explicitly since it's select:false)
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid name or password" });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        name: user.fullName,
        phone: user.phone,
        role: user.role,
      },
      token: generateToken(user._id, user.role, user.name),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      message: "User profile fetched successfully",
      user: {
        id: user._id,
        name: user.fullName,
        username: user.username,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete a surveyor by ID
router.delete('/delete/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const entry = await User.findOne({ fullName: name });

        if (!entry) {
            return res.status(404).json({ error: "User not found" });
        }
 
        await User.findOneAndDelete({ fullName: name });

        res.json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).send("Server error");
    }
});


module.exports = router;