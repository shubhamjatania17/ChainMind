import { useState, useEffect } from 'react';
import { database, ref, onValue, set, signOut, auth } from '../firebase';
import { Package, AlertTriangle, CheckCircle, Activity, BrainCircuit, LogOut, Loader2 } from 'lucide-react';
import axios from 'axios';

const INITIAL_STOCK = {
  Mumbai: 100,
  Delhi: 300,
  Bangalore: 200
};

const API_URL = 'http://localhost:5000';

function Dashboard({ user }) {
  const [inventory, setInventory] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [insight, setInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    const inventoryRef = ref(database, 'inventory');
    const unsubscribe = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setInventory(data);
      } else {
        // Initialize if empty
        set(inventoryRef, INITIAL_STOCK);
        setInventory(INITIAL_STOCK);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSimulate = async () => {
    if (!inventory) return;
    setSimulating(true);
    setInsight('');
    try {
      const response = await axios.post(`${API_URL}/simulate`, { inventory });
      const updatedStock = response.data.updatedInventory;
      
      // Update Firebase RTDB
      await set(ref(database, 'inventory'), updatedStock);
      
      // Now get AI Insights
      fetchAIInsights(updatedStock);
    } catch (error) {
      console.error('Simulation failed:', error);
      alert('Simulation failed. Make sure backend is running.');
    } finally {
      setSimulating(false);
    }
  };

  const fetchAIInsights = async (currentStock) => {
    setLoadingInsight(true);
    try {
      const response = await axios.post(`${API_URL}/ai-insight`, { inventory: currentStock });
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

  if (!inventory) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
        
        {/* Welcome Section & Simulation Action */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Welcome to ChainMind</h2>
            <p className="text-slate-500 mt-1 text-sm">Monitor your supply chain digital twin in real-time.</p>
          </div>
          <button 
            onClick={handleSimulate}
            disabled={simulating}
            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md shadow-blue-200 transition-all focus:ring-4 focus:ring-blue-100 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {simulating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Activity className="h-5 w-5" />}
            <span>{simulating ? 'Simulating...' : 'Simulate 30% Demand Surge'}</span>
          </button>
        </div>

        {/* Warehouse Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(inventory).map(([warehouse, stock]) => {
            const isRisk = stock < 80;
            return (
              <div key={warehouse} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{warehouse}</h3>
                    <p className="text-slate-500 text-sm">Warehouse Stock</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 border ${isRisk ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {isRisk ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
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
                {/* Simple markdown parsing for the generated text */}
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
