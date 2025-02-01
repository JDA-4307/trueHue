const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
const { spawn } = require("child_process"); // Import child_process

const app = express();
const PORT = 3050;

// Middlewares
app.use(
  cors({
    origin: "*", // Allows all origins (not recommended for production)
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Example route for testing
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.get("/test", (req, res) => {
  res.send("Test is running!");
});

// POST /test endpoint
app.post("/test", async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
      return res
        .status(400)
        .json({ error: "Missing 'image' or 'mimeType' in request body." });
    }

    // Prepare the input for the Python script
    const input = JSON.stringify({ image, mimeType });
    const startTime = Date.now();
    // Spawn the Python process
    const pythonProcess = spawn("python3", ["predict.py"]);

    let pythonOutput = "";
    let pythonError = "";

    // Handle stdout
    pythonProcess.stdout.on("data", (data) => {
      pythonOutput += data.toString();
    });

    // Handle stderr
    pythonProcess.stderr.on("data", (data) => {
      pythonError += data.toString();
    });

    // Handle process exit
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}: ${pythonError}`);
        return res.status(500).json({ error: "Error processing image." });
      }

      try {
        const result = JSON.parse(pythonOutput);
        if (result.error) {
          return res.status(500).json({ error: result.error });
        }
        const endTime = Date.now(); // Stop the timer
        console.log(`Elapsed time: ${endTime - startTime} ms`);
        return res.status(200).json(result);
      } catch (parseError) {
        console.error(`Error parsing Python script output: ${parseError}`);
        return res
          .status(500)
          .json({ error: "Error parsing script response." });
      }
    });

    // Write the input to the Python script's stdin
    pythonProcess.stdin.write(input);
    pythonProcess.stdin.end();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

app.post("/predict_medium_cherry", async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
      return res
        .status(400)
        .json({ error: "Missing 'image' or 'mimeType' in request body." });
    }

    // Prepare the input for the Python script
    const input = JSON.stringify({ image, mimeType });
    const startTime = Date.now();

    // Spawn the Python process
    const pythonProcess = spawn("python3", ["predict_medium_cherry.py"]);

    let pythonOutput = "";
    let pythonError = "";

    // Handle stdout
    pythonProcess.stdout.on("data", (data) => {
      pythonOutput += data.toString();
    });

    // Handle stderr
    pythonProcess.stderr.on("data", (data) => {
      pythonError += data.toString();
    });

    // Handle process exit
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}: ${pythonError}`);
        return res.status(500).json({ error: "Error processing image." });
      }

      try {
        const result = JSON.parse(pythonOutput);
        if (result.error) {
          return res.status(500).json({ error: result.error });
        }
        const endTime = Date.now();
        console.log(`Elapsed time: ${endTime - startTime} ms`);
        return res.status(200).json(result);
      } catch (parseError) {
        console.error(`Error parsing Python script output: ${parseError}`);
        return res
          .status(500)
          .json({ error: "Error parsing script response." });
      }
    });

    // Write the input to the Python script's stdin
    pythonProcess.stdin.write(input);
    pythonProcess.stdin.end();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

app.post("/predict_graphite_walnut", async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
      return res
        .status(400)
        .json({ error: "Missing 'image' or 'mimeType' in request body." });
    }

    // Prepare the input for the Python script
    const input = JSON.stringify({ image, mimeType });
    const startTime = Date.now();

    // Spawn the Python process
    const pythonProcess = spawn("python3", ["predict_graphite_walnut.py"]);

    let pythonOutput = "";
    let pythonError = "";

    // Handle stdout
    pythonProcess.stdout.on("data", (data) => {
      pythonOutput += data.toString();
    });

    // Handle stderr
    pythonProcess.stderr.on("data", (data) => {
      pythonError += data.toString();
    });

    // Handle process exit
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}: ${pythonError}`);
        return res.status(500).json({ error: "Error processing image." });
      }

      try {
        const result = JSON.parse(pythonOutput);
        if (result.error) {
          return res.status(500).json({ error: result.error });
        }
        const endTime = Date.now();
        console.log(`Elapsed time: ${endTime - startTime} ms`);
        return res.status(200).json(result);
      } catch (parseError) {
        console.error(`Error parsing Python script output: ${parseError}`);
        return res
          .status(500)
          .json({ error: "Error parsing script response." });
      }
    });

    // Write the input to the Python script's stdin
    pythonProcess.stdin.write(input);
    pythonProcess.stdin.end();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
