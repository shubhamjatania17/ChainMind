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

// Initialize Firebase Admin
const admin = require('firebase-admin');
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || './serviceaccountkey.json';
  const fs = require('fs');
  const path = require('path');
  const fullPath = path.resolve(__dirname, serviceAccountPath);
  
  if (fs.existsSync(fullPath)) {
    const serviceAccount = require(fullPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id || 'chainmind-fpb5'}-default-rtdb.firebaseio.com`
    });
    console.log("Firebase Admin initialized via service account JSON file");
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id || 'chainmind-fpb5'}-default-rtdb.firebaseio.com`
    });
    console.log("Firebase Admin initialized via environment JSON");
  } else {
    // Try application default credentials (ADC)
    admin.initializeApp({
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || 'https://chainmind-fpb5-default-rtdb.firebaseio.com'
    });
    console.log("Firebase Admin initialized via Application Default Credentials");
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

const db = admin.database();


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
  Object.entries(inv).forEach(([key, val]) => {
    let stock = 0;
    let type = 'local_dc';
    let parent = '';
    let city = '';
    let displayName = '';

    if (typeof val === 'number') {
      stock = val;
    } else if (val && typeof val === 'object') {
      stock = typeof val.stock === 'number' ? val.stock : parseInt(val.stock || 0);
      type = val.type || 'local_dc';
      parent = val.parent || '';
      city = val.city || '';
      displayName = val.displayName || '';
    }

    if (!city) {
      if (key.includes(' - ')) {
        const parts = key.split(' - ');
        city = parts[0].trim();
        displayName = parts.slice(1).join(' - ').trim();
      } else {
        city = key;
        displayName = type === 'factory' ? 'Factory' : type === 'regional_hub' ? 'Regional Hub' : 'Local DC';
      }
    }
    if (!displayName) {
      displayName = type === 'factory' ? 'Factory' : type === 'regional_hub' ? 'Regional Hub' : 'Local DC';
    }

    normalized[key] = {
      stock,
      type,
      parent,
      city,
      displayName
    };
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

    const rawHtml = marked(reportText);
    const doppioApiKey = process.env.DOPPIO_API_KEY || process.env.DOPPIO_KEY || process.env.DOPPIO_TOKEN;
    const pdfmonkeyApiKey = process.env.PDFMONKEY_API_KEY;
    const templateId = process.env.PDFMONKEY_TEMPLATE_ID;

    if (!doppioApiKey && (!pdfmonkeyApiKey || !templateId)) {
      return res.status(500).json({ error: 'Doppio credentials missing in environment variables (DOPPIO_API_KEY)' });
    }

    // Primary: Generate PDF using Doppio API (doppio.sh)
    if (doppioApiKey) {
      const fullStyledHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ChainMind Mitigation Report</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.6;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-text {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .badge {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 12px;
      border-radius: 20px;
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 12px;
    }
    h2 {
      font-size: 16px;
      font-weight: 700;
      color: #1e3a8a;
      border-left: 4px solid #3b82f6;
      padding-left: 10px;
      margin-top: 24px;
      margin-bottom: 10px;
    }
    h3 {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 16px;
      margin-bottom: 8px;
    }
    p {
      margin-top: 0;
      margin-bottom: 10px;
      color: #334155;
    }
    ul, ol {
      margin-top: 0;
      margin-bottom: 12px;
      padding-left: 20px;
      color: #334155;
    }
    li {
      margin-bottom: 4px;
    }
    strong {
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f8fafc;
      font-weight: 700;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-text">ChainMind</div>
    <div class="badge">Mitigation Report • Confidential</div>
  </div>

  <div class="content">
    ${rawHtml}
  </div>

  <div class="footer">
    <span>ChainMind Supply Chain Digital Twin Platform</span>
    <span>Generated by AI Intelligence</span>
  </div>
</body>
</html>`;

      const htmlBase64 = Buffer.from(fullStyledHtml, 'utf8').toString('base64');

      const doppioResponse = await axios.post(
        'https://api.doppio.sh/v1/render/pdf/sync',
        {
          page: {
            setContent: {
              html: htmlBase64,
              waitUntil: 'networkidle0'
            },
            pdf: {
              format: 'A4',
              printBackground: true,
              margin: {
                top: '15mm',
                bottom: '15mm',
                left: '15mm',
                right: '15mm'
              }
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${doppioApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const downloadUrl = doppioResponse.data?.documentUrl || doppioResponse.data?.url || doppioResponse.data?.pdfUrl;

      if (downloadUrl) {
        return res.json({ pdfUrl: downloadUrl });
      } else {
        console.error("Doppio response missing URL:", doppioResponse.data);
        throw new Error('Doppio did not return a valid document URL');
      }
    }

    // Fallback: PDFMonkey
    const pdfResponse = await axios.post('https://api.pdfmonkey.io/api/v1/documents', {
      document: {
        document_template_id: templateId,
        payload: { reportHtml: rawHtml },
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
      throw new Error('PDF generation timed out');
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
