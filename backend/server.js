const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create uploads directory if it doesn't exist
const fs = require("fs");
if (!fs.existsSync("./uploads")) {
    fs.mkdirSync("./uploads");
}

// MongoDB connection
const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/tutedude_proctoring";
mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Interview Session Schema
const sessionSchema = new mongoose.Schema({
    candidateName: String,
    interviewerId: String,
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    isActive: { type: Boolean, default: true },
    events: [
        {
            type: String, // 'focus_lost', 'no_face', 'multiple_faces', 'object_detected'
            description: String,
            timestamp: { type: Date, default: Date.now },
            severity: String, // 'low', 'medium', 'high'
        },
    ],
    integrityScore: { type: Number, default: 100 },
});

const Session = mongoose.model("Session", sessionSchema);

// Routes

// Start new interview session
app.post("/api/session/start", async (req, res) => {
    try {
        const { candidateName, interviewerId } = req.body;
        const session = new Session({
            candidateName,
            interviewerId,
        });
        await session.save();
        res.json({ success: true, sessionId: session._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// End interview session
app.patch("/api/session/:id/end", async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        session.endTime = new Date();
        session.isActive = false;
        await session.save();

        res.json({ success: true, session });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Log proctoring events
app.post("/api/session/:id/event", async (req, res) => {
    try {
        const { type, description, severity = "medium" } = req.body;
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        // Add event (score deduction now handled by frontend)
        session.events.push({
            type,
            description,
            severity,
            timestamp: new Date(),
        });

        console.log(`Violation logged: ${type} (${severity}) - ${description}`);

        await session.save();
        res.json({
            success: true,
            eventLogged: true,
            violationType: type,
            severity: severity,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get session status (for polling)
app.get("/api/session/:id/status", async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        // Get recent events (last 10)
        const recentEvents = session.events.slice(-10);

        res.json({
            sessionId: session._id,
            candidateName: session.candidateName,
            startTime: session.startTime,
            isActive: session.isActive,
            integrityScore: session.integrityScore,
            eventCount: session.events.length,
            recentEvents,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get full session report
app.get("/api/session/:id/report", async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        // Calculate statistics
        const duration = session.endTime
            ? (session.endTime - session.startTime) / 1000 / 60 // minutes
            : (new Date() - session.startTime) / 1000 / 60;

        const eventStats = session.events.reduce((stats, event) => {
            stats[event.type] = (stats[event.type] || 0) + 1;
            return stats;
        }, {});

        res.json({
            session,
            duration: Math.round(duration * 100) / 100,
            eventStats,
            totalEvents: session.events.length,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Multer configuration for video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `${req.params.id}-${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

// Upload recorded video
app.post(
    "/api/session/:id/upload-video",
    upload.single("video"),
    (req, res) => {
        try {
            if (!req.file) {
                return res
                    .status(400)
                    .json({ error: "No video file uploaded" });
            }

            res.json({
                success: true,
                filename: req.file.filename,
                path: `/uploads/${req.file.filename}`,
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Update session score
app.patch("/api/session/:id/score", async (req, res) => {
    try {
        const { integrityScore } = req.body;
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        if (
            typeof integrityScore !== "number" ||
            integrityScore < 0 ||
            integrityScore > 100
        ) {
            return res
                .status(400)
                .json({
                    error: "Invalid integrity score. Must be a number between 0 and 100.",
                });
        }

        const oldScore = session.integrityScore;
        session.integrityScore = integrityScore;

        await session.save();

        console.log(
            `Score updated: ${oldScore} → ${session.integrityScore} for session ${session._id}`
        );

        res.json({
            success: true,
            sessionId: session._id,
            oldScore,
            newScore: session.integrityScore,
        });
    } catch (error) {
        console.error("Error updating score:", error);
        res.status(500).json({ error: error.message });
    }
});

// Catch-all error handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl,
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
