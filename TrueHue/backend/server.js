const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Example route for testing
app.get("/", (req, res) => {
  res.send("Backend is running!");
});
app.get("/test", (req, res) => {
  res.send("test is running!");
});
app.post("/test", async (req, res) => {
  const text = "hi";
  const { image, mimeType } = req.body;

  const GEMINI_API_KEY = "AIzaSyDtz8L71BONrRHHRRbs1oICM4-O02zlO88"; // Replace with your API key
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  // Prepare the payload
  const payload = {
    contents: [
      {
        parts: [
          {
            text: "Tell me what color this wood veneer is.",
          },
        ],
      },
    ],
  };
  // Make the API call to Gemini
  const response = await axios.post(GEMINI_API_URL, payload, {
    headers: { "Content-Type": "application/json" },
  });

  // Return the response from Gemini
  return res.status(200).json(response.data);
  //return res.send({ message: "response" });
});

// Endpoint for analyzing images with Gemini API
app.post("/analyze", async (req, res) => {
  try {
    console.log("before file call");
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    console.log("before api call");

    // Convert image to Base64
    const base64Image = req.file.buffer.toString("base64");

    // Gemini API details
    const GEMINI_API_KEY = "AIzaSyDtz8L71BONrRHHRRbs1oICM4-O02zlO88"; // Replace with your API key
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Prepare the payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: "Tell me what color this wood veneer is.",
              inlineData: {
                mimeType: req.file.mimetype,
                data: base64Image,
              },
            },
          ],
        },
      ],
    };

    // Make the API call to Gemini
    const response = await axios.post(GEMINI_API_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    // Return the response from Gemini
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
