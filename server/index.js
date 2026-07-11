const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { marked } = require('marked');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini API
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * Utility to strip wrapping markdown code blocks (```markdown ... ```) 
 * that some models (like Gemini 3) often include.
 */
function cleanMarkdown(text) {
  if (!text) return text;
  let cleaned = text.trim();
  // Remove markdown code block wrappers if they exist
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:markdown)?\n?/i, '');
    cleaned = cleaned.replace(/\n?```$/i, '');
  }
  return cleaned.trim();
}

// Normalization Utility
function normalizeInventory(inv) {
  if (!inv) return {};
  const normalized = {};
  Object.entries(inv).forEach(([name, val]) => {
    if (typeof val === 'number') {
      normalized[name] = {
        stock: val,
        type: 'local_dc',
        parent: ''
      };
    } else if (val && typeof val === 'object') {
      normalized[name] = {
        stock: typeof val.stock === 'number' ? val.stock : parseInt(val.stock || 0),
        type: val.type || 'local_dc',
        parent: val.parent || ''
      };
    }
  });
  return normalized;
}

// Hierarchical Upstream Replenishment Propagation
function propagateReplenishment(inventory, nodeName, logs) {
  const node = inventory[nodeName];
  if (!node || !node.parent) return;

  const parentName = node.parent;
  const parent = inventory[parentName];
  if (!parent) return;

  // Safety stock: LDC safety = 80, Hub safety = 80, Factory safety = 50.
  const safetyStock = node.type === 'factory' ? 50 : 80;
  if (node.stock >= safetyStock) return;

  const deficit = safetyStock - node.stock;

  // Parent safety threshold: parent won't deplete below this to help children
  const parentSafety = parent.type === 'factory' ? 50 : 80;
  const available = Math.max(0, parent.stock - parentSafety);

  const transfer = Math.min(deficit, available);
  if (transfer > 0) {
    node.stock += transfer;
    parent.stock -= transfer;
    logs.push(`Replenished: Transferred ${transfer} units from ${parentName} (${parent.type === 'factory' ? 'Factory' : parent.type === 'regional_hub' ? 'Regional Hub' : 'Local DC'}) to ${nodeName} (${node.type === 'factory' ? 'Factory' : node.type === 'regional_hub' ? 'Regional Hub' : 'Local DC'}).`);

    // Recursively propagate upstream replenishment
    propagateReplenishment(inventory, parentName, logs);
  }
}

// Simulate Route
app.post('/simulate', (req, res) => {
  try {
    const { inventory, targetCity, surgePercentage } = req.body;
    if (!inventory || !targetCity || !surgePercentage) {
      return res.status(400).json({ error: 'Inventory, targetCity, and surgePercentage are required' });
    }

    const normalized = normalizeInventory(inventory);
    const updatedInventory = JSON.parse(JSON.stringify(normalized)); // deep copy
    
    const logs = [];
    if (updatedInventory[targetCity]) {
      const node = updatedInventory[targetCity];
      const currentStock = node.stock;
      const reduction = Math.floor(currentStock * (surgePercentage / 100));
      node.stock = Math.max(0, currentStock - reduction);
      logs.push(`Surge Impact: Demand surge of ${surgePercentage}% reduced stock at ${targetCity} (${node.type === 'factory' ? 'Factory' : node.type === 'regional_hub' ? 'Regional Hub' : 'Local DC'}) by ${reduction} units.`);
      
      // Propagate replenishment upstream
      propagateReplenishment(updatedInventory, targetCity, logs);
    } else {
      logs.push(`Error: Target node ${targetCity} not found in inventory.`);
    }

    res.json({ updatedInventory, logs });
  } catch (error) {
    console.error("Simulation error:", error);
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

    const normalized = normalizeInventory(inventory);

    if (!genAI) {
      return res.status(503).json({ error: 'Gemini API key not configured on server' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    // Add specific context if a simulation was just run
    let eventContext = '';
    if (targetCity && surgePercentage) {
      eventContext = `A simulated demand surge of ${surgePercentage}% just occurred in ${targetCity}. `;
    }

    const prompt = `Analyze this hierarchical multi-tier supply chain network (Factories -> Regional Hubs -> Local Distribution Centers). ${eventContext}Identify cross-tier bottlenecks, transportation risks, and stockout threats at critical LDCs. Recommend specific cross-tier stock allocations, production rate increases at factories, or local redistributions to stabilize the network.

Current Network State: ${JSON.stringify(normalized)}
Note: Stock < 80 is considered critical/at risk for Hubs and LDCs. Factories are primary production centers.

IMPORTANT: Return ONLY the markdown content. Do NOT wrap your entire response in triple backticks (e.g., \`\`\`markdown ... \`\`\`).`;
    
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
      return res.json({ insight: cleanMarkdown(text) });
    } 
    
    // Fallback: Generate a Mock Response
    let criticalNodes = [];
    let stableNodes = [];
    
    for (const [name, node] of Object.entries(normalized)) {
      const threshold = node.type === 'factory' ? 100 : 80;
      if (node.stock < threshold) {
        criticalNodes.push({ name, ...node });
      } else {
        stableNodes.push({ name, ...node });
      }
    }
    
    let mockText = `**[Mock Intelligence - Live API Unavailable]**\n\n`;
    if (targetCity && surgePercentage) {
        mockText += `* **Event Detected**: A simulated demand surge of **${surgePercentage}%** just impacted **${targetCity}**.\n`;
    }
    
    if (criticalNodes.length > 0) {
        mockText += `### Critical Bottlenecks Found:\n`;
        criticalNodes.forEach(node => {
          mockText += `* **${node.name}** (${node.type === 'factory' ? 'Factory' : node.type === 'regional_hub' ? 'Regional Hub' : 'Local DC'}): Currently at **${node.stock}** units (below safety limits).\n`;
          if (node.parent && normalized[node.parent]) {
            const parent = normalized[node.parent];
            mockText += `  * *Upstream Connection*: Linked to **${node.parent}** (${parent.stock} units available).\n`;
          }
        });
        
        mockText += `\n### Recommendations:\n`;
        criticalNodes.forEach(node => {
          if (node.parent && normalized[node.parent] && normalized[node.parent].stock > 100) {
            mockText += `1. **Replenish ${node.name}**: Increase transfer capacity from its upstream parent **${node.parent}** which holds a healthy surplus of ${normalized[node.parent].stock} units.\n`;
          } else if (node.type === 'local_dc') {
            const localAlternatives = stableNodes.filter(n => n.type === 'local_dc' && n.stock > 100);
            if (localAlternatives.length > 0) {
              mockText += `1. **Reroute Local Stocks**: Shift inventory laterally from **${localAlternatives[0].name}** to **${node.name}** to prevent local stockout.\n`;
            } else {
              mockText += `1. **Production Boost**: Factory production must be accelerated. End distribution node **${node.name}** is depleted and upstream nodes have no surplus.\n`;
            }
          } else {
            mockText += `1. **Expedite Supplier Delivery**: Trigger emergency supply runs to replenish **${node.name}** directly.\n`;
          }
        });
    } else {
        mockText += `* **Status**: Network is stable. All hierarchical tiers (Factories, Hubs, LDCs) are operating securely above safety thresholds.\n`;
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

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const now = new Date().toLocaleString();
    const prompt = `Read the following AI analysis of a supply chain scenario and generate a detailed Mitigation Report with proper step-by-step actions to resolve any critical issues. Format the report nicely in Markdown.\n\nReport Timestamp: ${now}\n\nAI Analysis:\n${insight}\n\nIMPORTANT: Include the Report Timestamp in the header of your response. Return ONLY the markdown content. Do NOT wrap your entire response in triple backticks (e.g., \`\`\`markdown ... \`\`\`).`;
    
    let result;
    let retries = 3;
    let delay = 1000;
    let apiSuccess = false;
    
    while (retries > 0) {
      try {
        result = await model.generateContent(prompt);
        apiSuccess = true;
        break;
      } catch (err) {
        if (err.message.includes('503') || err.message.includes('high demand') || err.status === 503 || err.status === 429) {
          retries--;
          if (retries === 0) {
            console.warn("Gemini API overloaded. Falling back to mock mitigation report.");
            break;
          }
          console.warn(`Gemini API overloaded. Retrying mitigation report in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 2;
        } else {
          console.warn(`Gemini API Error: ${err.message}. Falling back to mock mitigation report.`);
          break;
        }
      }
    }

    let reportText = '';
    if (apiSuccess && result && result.response) {
      reportText = cleanMarkdown(result.response.text());
    } else {
      // Fallback: Generate a Mock Mitigation Report
      const now = new Date().toLocaleString();
      reportText = `## ChainMind Mitigation Report (Mock Mode)
*Generated at: ${now}*

*Notice: The live AI API is currently experiencing high demand. This is a locally generated fallback report.*

### Phase 1: Immediate Stabilization (0-24 Hours)
1. **Assess Critical Nodes**: Immediately quantify the deficit in warehouses showing <80 units.
2. **Emergency Redistribution**: Reroute up to 20% of inventory from the nearest stable nodes.
3. **Communication**: Alert local distribution centers about impending delays or stock limitations.

### Phase 2: Restocking & Logistics (24-72 Hours)
1. **Expedite Supplier Orders**: Trigger emergency purchase orders with key suppliers.
2. **Prioritize Inbound Shipments**: Divert new incoming stock directly to the critical nodes.

### Phase 3: Strategic Measures (Long-term)
1. **Review Safety Stocks**: Re-evaluate safety stock levels to buffer against future surges.
2. **Improve Forecasting**: Incorporate recent surge data into predictive models.`;
    }

    const htmlContent = marked(reportText);
    const pdfmonkeyApiKey = process.env.PDFMONKEY_API_KEY;
    const templateId = process.env.PDFMONKEY_TEMPLATE_ID;

    if (!pdfmonkeyApiKey || !templateId) {
      return res.status(500).json({ error: 'PDFMonkey credentials missing in .env' });
    }

    const pdfResponse = await axios.post('https://api.pdfmonkey.io/api/v1/documents', {
      document: {
        document_template_id: templateId,
        payload: { reportHtml: htmlContent },
        status: 'pending'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${pdfmonkeyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const documentId = pdfResponse.data.document.id;
    let downloadUrl = null;
    let pollRetries = 10;
    
    while (pollRetries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      const statusRes = await axios.get(`https://api.pdfmonkey.io/api/v1/documents/${documentId}`, {
        headers: { 'Authorization': `Bearer ${pdfmonkeyApiKey}` }
      });
      if (statusRes.data.document.status === 'success') {
        downloadUrl = statusRes.data.document.download_url;
        break;
      } else if (statusRes.data.document.status === 'failure') {
        throw new Error('PDFMonkey generation failed');
      }
      pollRetries--;
    }

    if (downloadUrl) {
      return res.json({ pdfUrl: downloadUrl });
    } else {
      throw new Error('PDFMonkey generation timed out');
    }
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
