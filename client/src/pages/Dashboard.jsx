import { useState, useEffect } from 'react';
import { database, ref, onValue, set, remove, signOut, auth } from '../firebase';
import { Package, AlertTriangle, CheckCircle, Activity, BrainCircuit, LogOut, Loader2, RefreshCw, Settings } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5000';

function Dashboard({ user }) {
  const [inventory, setInventory] = useState(null);
  const [dbLoaded, setDbLoaded] = useState(false);
  
  // Setup State
  const [setupCount, setSetupCount] = useState(3);
  const [setupData, setSetupData] = useState([]);

  // Simulation State
  const [simTargetCity, setSimTargetCity] = useState('');
  const [simSurgePercent, setSimSurgePercent] = useState(30);
  const [simulating, setSimulating] = useState(false);
  
  // AI Insights State
  const [insight, setInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    const inventoryRef = ref(database, 'inventory');
    const unsubscribe = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val();
      setInventory(data); // Will be null if empty
      
      // Auto-select first city for simulation dropdown if available
      if (data && Object.keys(data).length > 0) {
        if (!simTargetCity || !Object.keys(data).includes(simTargetCity)) {
          setSimTargetCity(Object.keys(data)[0]);
        }
      }
      setDbLoaded(true);
    });

    return () => unsubscribe();
  }, [simTargetCity]);

  // Handle Setup Inputs
  const handleSetupCountChange = (e) => {
    const count = parseInt(e.target.value) || 1;
    setSetupCount(count);
  };

  const handleGenerateInputs = () => {
    setSetupData(Array.from({ length: setupCount }, () => ({ name: '', stock: '' })));
  };

  const handleSetupDataChange = (index, field, value) => {
    const newData = [...setupData];
    newData[index][field] = value;
    setSetupData(newData);
  };

  const handleSaveSetup = async () => {
    // Validate
    if (setupData.some(d => !d.name.trim() || d.stock === '')) {
      alert("Please fill in all city names and stock amounts.");
      return;
    }
    
    const newInventory = {};
    setupData.forEach(d => {
      newInventory[d.name.trim()] = parseInt(d.stock);
    });

    await set(ref(database, 'inventory'), newInventory);
  };

  const handleResetApp = async () => {
    if (window.confirm("Are you sure you want to reset the configuration and delete all warehouse data?")) {
      await remove(ref(database, 'inventory'));
      setSetupData([]);
      setInsight('');
    }
  };

  const handleSimulate = async () => {
    if (!inventory || !simTargetCity) return;
    setSimulating(true);
    setInsight('');
    try {
      const payload = {
        inventory,
        targetCity: simTargetCity,
        surgePercentage: parseInt(simSurgePercent)
      };

      const response = await axios.post(`${API_URL}/simulate`, payload);
      const updatedStock = response.data.updatedInventory;
      
      // Update Firebase RTDB
      await set(ref(database, 'inventory'), updatedStock);
      
      // Now get AI Insights
      fetchAIInsights(updatedStock, simTargetCity, simSurgePercent);
    } catch (error) {
      console.error('Simulation failed:', error);
      alert('Simulation failed. Make sure backend is running.');
    } finally {
      setSimulating(false);
    }
  };

  const fetchAIInsights = async (currentStock, target, surge) => {
    setLoadingInsight(true);
    try {
      const payload = { inventory: currentStock, targetCity: target, surgePercentage: surge };
      const response = await axios.post(`${API_URL}/ai-insight`, payload);
      setInsight(response.data.insight);
    } catch (error) {
      console.error('AI Insight failed:', error);
      setInsight('Could not load AI insights. Please verify Gemini API key and backend connection.');
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (!dbLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // === SETUP MODE UI ===
  if (!inventory) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
               <Settings className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-6 text-2xl font-extrabold text-slate-900 tracking-tight">System Configuration</h2>
            <p className="mt-2 text-sm text-slate-500">Define your supply chain network to start the digital twin.</p>
          </div>

          {setupData.length === 0 ? (
            <div className="mt-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Number of Cities/Warehouses</label>
                <input 
                  type="number" 
                  min="1" 
                  value={setupCount} 
                  onChange={handleSetupCountChange}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <button 
                onClick={handleGenerateInputs}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Configure Cities
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {setupData.map((data, index) => (
                <div key={index} className="flex space-x-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500">City Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mumbai"
                      value={data.name}
                      onChange={(e) => handleSetupDataChange(index, 'name', e.target.value)}
                      className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500">Initial Stock</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="e.g. 100"
                      value={data.stock}
                      onChange={(e) => handleSetupDataChange(index, 'stock', e.target.value)}
                      className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
              <div className="pt-4 flex space-x-4">
                <button 
                  onClick={() => setSetupData([])}
                  className="flex-1 py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                >
                  Back
                </button>
                <button 
                  onClick={handleSaveSetup}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save & Launch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === DASHBOARD UI ===
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
               <Package className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ChainMind Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-600 hidden sm:block">
              {user?.email || user?.displayName}
            </span>
            <button 
              onClick={handleResetApp}
              className="flex items-center space-x-1 px-3 py-2 rounded-md bg-red-50 hover:bg-red-100 text-red-600 transition-colors text-sm font-medium"
              title="Reset System"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Simulation Control Panel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Demand Simulation Engine</h2>
            <p className="text-slate-500 mt-1 text-sm">Target a specific city to simulate a sudden surge in demand.</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-end space-y-4 md:space-y-0 md:space-x-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Target City</label>
              <select 
                value={simTargetCity}
                onChange={(e) => setSimTargetCity(e.target.value)}
                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {Object.keys(inventory).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Surge Percentage (%)</label>
              <input 
                type="number" 
                min="1" 
                max="100"
                value={simSurgePercent}
                onChange={(e) => setSimSurgePercent(e.target.value)}
                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div className="w-full md:w-1/3">
              <button 
                onClick={handleSimulate}
                disabled={simulating}
                className="w-full flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md shadow-blue-200 transition-all focus:ring-4 focus:ring-blue-100 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {simulating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Activity className="h-5 w-5" />}
                <span>{simulating ? 'Simulating...' : 'Run Simulation'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Warehouse Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Object.entries(inventory).map(([warehouse, stock]) => {
            const isRisk = stock < 80;
            return (
              <div key={warehouse} className={`bg-white rounded-2xl p-6 shadow-sm border ${warehouse === simTargetCity ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-100'} flex flex-col justify-between hover:shadow-md transition-shadow`}>
                <div className="flex justify-between items-start">
                  <div className="overflow-hidden">
                    <h3 className="text-lg font-semibold text-slate-800 truncate" title={warehouse}>{warehouse}</h3>
                    <p className="text-slate-500 text-sm">Warehouse Stock</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center space-x-1 border ${isRisk ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {isRisk ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                    <span>{isRisk ? 'Risk' : 'Normal'}</span>
                  </div>
                </div>
                <div className="mt-6 flex items-baseline space-x-2">
                  <span className={`text-4xl font-extrabold tracking-tight ${isRisk ? 'text-red-600' : 'text-slate-900'}`}>
                    {stock}
                  </span>
                  <span className="text-slate-500 text-sm font-medium">units</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Insight Panel */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-white/5">
            <div className="flex items-center space-x-2 text-white">
              <BrainCircuit className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold">ChainMind AI Insights</h3>
            </div>
            {loadingInsight && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
          <div className="p-6">
            {loadingInsight ? (
              <div className="flex flex-col space-y-3 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-700 rounded w-full"></div>
                <div className="h-4 bg-slate-700 rounded w-5/6"></div>
              </div>
            ) : insight ? (
              <div className="prose prose-invert prose-blue max-w-none text-slate-300 text-sm leading-relaxed">
                {insight.split('\n').map((line, i) => {
                  if (line.trim().startsWith('**')) {
                    return <h4 key={i} className="text-white mt-4 mb-2 font-semibold text-base">{line.replace(/\*\*/g, '')}</h4>;
                  } else if (line.trim().startsWith('*')) {
                    return <li key={i} className="ml-4 mb-1 list-disc">{line.substring(1).trim().replace(/\*\*/g, '')}</li>;
                  } else if (line.trim() !== '') {
                    return <p key={i} className="mb-2">{line.replace(/\*\*/g, '')}</p>;
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="text-slate-400 italic text-sm text-center py-6">
                Run a simulation to generate AI insights for your supply chain.
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

export default Dashboard;
