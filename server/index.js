const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini API
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Simulate Route
app.post('/simulate', (req, res) => {
  try {
    const { inventory, targetCity, surgePercentage } = req.body;
    if (!inventory || !targetCity || !surgePercentage) {
      return res.status(400).json({ error: 'Inventory, targetCity, and surgePercentage are required' });
    }

    const updatedInventory = { ...inventory };
    
    if (updatedInventory[targetCity]) {
      const currentStock = updatedInventory[targetCity];
      const reduction = Math.floor(currentStock * (surgePercentage / 100));
      updatedInventory[targetCity] = Math.max(0, currentStock - reduction);
    }

    res.json({ updatedInventory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Insights Route
app.post('/ai-insight', async (req, res) => {
  try {
    const { inventory, targetCity, surgePercentage } = req.body;
    if (!inventory) {
      return res.status(400).json({ error: 'Inventory data is required' });
    }

    if (!genAI) {
      return res.status(503).json({ error: 'Gemini API key not configured on server' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Add specific context if a simulation was just run
    let eventContext = '';
    if (targetCity && surgePercentage) {
      eventContext = `A simulated demand surge of ${surgePercentage}% just occurred in ${targetCity}. `;
    }

    const prompt = `Analyze this supply chain inventory scenario. ${eventContext}Identify risks and suggest actions like stock redistribution or restocking.\n\nCurrent Inventory: ${JSON.stringify(inventory)}\nNote: Stock < 80 is considered at Risk.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ insight: text });
  } catch (error) {
    console.error("AI Insight Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Health Check Route for Render
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'ChainMind API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ChainMind server running on port ${PORT}`);
});
