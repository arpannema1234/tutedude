const express = require("express");
const app = express();

// Basic route
app.get("/", (req, res) => {
    res.json({ message: "Server is working!" });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});
