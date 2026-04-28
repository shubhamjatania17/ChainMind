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
    
    let result;
    let retries = 3;
    let delay = 1000;
    let apiSuccess = false;
    
    while (retries > 0) {
      try {
        result = await model.generateContent(prompt);
        apiSuccess = true;
        break; // Success! Break out of the retry loop
      } catch (err) {
        // If it's a 503 High Demand or 429 Quota error, retry
        if (err.message.includes('503') || err.message.includes('high demand') || err.status === 503 || err.status === 429) {
          retries--;
          if (retries === 0) {
            console.warn("Gemini API overloaded. Falling back to mock response.");
            break;
          }
          console.warn(`Gemini API overloaded. Retrying in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // Exponential backoff
        } else {
          console.warn(`Gemini API Error: ${err.message}. Falling back to mock response.`);
          break; // Other errors fallback immediately
        }
      }
    }

    // If the API call succeeded, return the real response
    if (apiSuccess && result && result.response) {
      const text = result.response.text();
      return res.json({ insight: text });
    } 
    
    // Fallback: Generate a Mock Response
    let criticalCities = [];
    let stableCities = [];
    for (const [city, stock] of Object.entries(inventory)) {
        if (stock < 80) criticalCities.push(city);
        else stableCities.push(city);
    }
    
    let mockText = `**[Mock Intelligence - Live API Unavailable]**\n\n`;
    if (targetCity && surgePercentage) {
        mockText += `* **Event Detected**: A simulated demand surge of **${surgePercentage}%** just impacted **${targetCity}**.\n`;
    }
    
    if (criticalCities.length > 0) {
        mockText += `* **Critical Nodes**: **${criticalCities.join(', ')}** dropped below the safe threshold of 80 units.\n`;
        if (stableCities.length > 0) {
            mockText += `* **Recommendation**: Reroute excess inventory from **${stableCities[0]}** to stabilize the network immediately.\n`;
        } else {
            mockText += `* **Recommendation**: **Emergency Restocking Required!** No stable warehouses available for local rerouting.\n`;
        }
    } else {
        mockText += `* **Status**: Network is stable. All nodes are operating securely above critical thresholds.\n`;
    }

    res.json({ insight: mockText });
  } catch (error) {
    console.error("AI Insight Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Mitigation Report Route
app.post('/generate-mitigation-report', async (req, res) => {
  try {
    const { insight } = req.body;
    if (!insight) {
      return res.status(400).json({ error: 'Insight text is required' });
    }

    if (!genAI) {
      return res.status(503).json({ error: 'Gemini API key not configured on server' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `Read the following AI analysis of a supply chain scenario and generate a detailed Mitigation Report with proper step-by-step actions to resolve any critical issues. Format the report nicely in Markdown.\n\nAI Analysis:\n${insight}`;
    
    const result = await model.generateContent(prompt);
    
    if (result && result.response) {
      const text = result.response.text();
      return res.json({ report: text });
    }
    
    res.status(500).json({ error: 'Failed to generate mitigation report' });
  } catch (error) {
    console.error("Mitigation Report Error:", error);
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
