import { useState, useEffect } from 'react';
import { database, ref, onValue, set, remove, signOut, auth } from '../firebase';
import { AlertTriangle, CheckCircle, Activity, BrainCircuit, LogOut, Loader2, RefreshCw, Settings, PackageOpen, Download } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

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
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    const inventoryRef = ref(database, 'inventory');
    const unsubscribe = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val();
      setInventory(data); // Will be null if empty
      
      if (data && Object.keys(data).length > 0) {
        if (!simTargetCity || !Object.keys(data).includes(simTargetCity)) {
          setSimTargetCity(Object.keys(data)[0]);
        }
      }
      setDbLoaded(true);
    });

    return () => unsubscribe();
  }, [simTargetCity]);

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
      const payload = { inventory, targetCity: simTargetCity, surgePercentage: parseInt(simSurgePercent) };
      const response = await axios.post(`${API_URL}/simulate`, payload);
      const updatedStock = response.data.updatedInventory;
      await set(ref(database, 'inventory'), updatedStock);
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

  const handleDownloadMitigationReport = async () => {
    setDownloadingPDF(true);
    try {
      const response = await axios.post(`${API_URL}/generate-mitigation-report`, { insight });
      const pdfUrl = response.data.pdfUrl;
      
      if (pdfUrl) {
         window.open(pdfUrl, '_blank');
      } else {
         throw new Error('PDF URL not received');
      }
      setDownloadingPDF(false);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF mitigation report. Ensure PDFMonkey API key is correct.');
      setDownloadingPDF(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (!dbLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  // === SETUP MODE UI ===
  if (!inventory) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden">
        {/* BG Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]"></div>
        </div>

        <div className="max-w-xl w-full space-y-8 bg-white/5 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/10 relative z-10">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
               <Settings className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-white font-display tracking-tight">System Configuration</h2>
            <p className="mt-2 text-sm text-slate-400">Map your physical warehouse network to the digital twin.</p>
          </div>

          {setupData.length === 0 ? (
            <div className="mt-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300">Number of Warehouses</label>
                <input 
                  type="number" 
                  min="1" 
                  value={setupCount} 
                  onChange={handleSetupCountChange}
                  className="mt-2 block w-full px-4 py-3 border border-white/10 rounded-xl bg-black/20 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm transition-all"
                />
              </div>
              <button 
                onClick={handleGenerateInputs}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all"
              >
                Configure Network
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {setupData.map((data, index) => (
                <div key={index} className="flex space-x-4 p-4 bg-black/20 rounded-xl border border-white/5">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400">City Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mumbai"
                      value={data.name}
                      onChange={(e) => handleSetupDataChange(index, 'name', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white text-sm focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400">Initial Stock</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="e.g. 100"
                      value={data.stock}
                      onChange={(e) => handleSetupDataChange(index, 'stock', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white text-sm focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              ))}
              <div className="pt-4 flex space-x-4">
                <button 
                  onClick={() => setSetupData([])}
                  className="flex-1 py-3 px-4 border border-white/10 rounded-xl shadow-sm text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={handleSaveSetup}
                  className="flex-1 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all"
                >
                  Launch Twin
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
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[150px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-slate-900/50 backdrop-blur-xl border-b border-white/5 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link to="/" className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform">
               <PackageOpen className="h-6 w-6 text-white" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">ChainMind</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs font-medium text-slate-300">{user?.email}</span>
            </div>
            <button 
              onClick={handleResetApp}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all text-sm font-medium group"
              title="Factory Reset"
            >
              <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
              <span className="hidden sm:inline">Reset Network</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-all text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Simulation Control Panel */}
        <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>
          
          <div className="mb-6 relative z-10">
            <h2 className="text-2xl font-bold text-white font-display flex items-center space-x-2">
              <Activity className="h-6 w-6 text-blue-400" />
              <span>Demand Simulation Engine</span>
            </h2>
            <p className="text-slate-400 mt-1 text-sm">Inject targeted disruptions to stress-test your supply chain network.</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-end space-y-4 md:space-y-0 md:space-x-4 bg-black/20 p-5 rounded-2xl border border-white/5 relative z-10">
            <div className="w-full md:w-1/3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Node</label>
              <select 
                value={simTargetCity}
                onChange={(e) => setSimTargetCity(e.target.value)}
                className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
              >
                {Object.keys(inventory).map(city => (
                  <option key={city} value={city} className="bg-slate-800 text-white">{city}</option>
                ))}
              </select>
            </div>
            
            <div className="w-full md:w-1/3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Demand Surge (%)</label>
              <input 
                type="number" 
                min="1" 
                max="100"
                value={simSurgePercent}
                onChange={(e) => setSimSurgePercent(e.target.value)}
                className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm transition-colors"
              />
            </div>

            <div className="w-full md:w-1/3">
              <button 
                onClick={handleSimulate}
                disabled={simulating}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {simulating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Activity className="h-5 w-5 group-hover:scale-110 transition-transform" />}
                <span>{simulating ? 'Processing...' : 'Inject Surge'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Warehouse Network Cards */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">Global Network Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Object.entries(inventory).map(([warehouse, stock]) => {
              const isRisk = stock < 80;
              return (
                <div key={warehouse} className={`relative bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 shadow-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 ${warehouse === simTargetCity ? 'border-blue-500/50 shadow-blue-500/10' : 'border-white/5 hover:border-white/20'}`}>
                  
                  {/* Danger Glow Effect */}
                  {isRisk && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>}
                  {warehouse === simTargetCity && !isRisk && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>}

                  <div className="flex justify-between items-start relative z-10">
                    <div className="overflow-hidden pr-2">
                      <h3 className="text-xl font-bold text-white font-display truncate" title={warehouse}>{warehouse}</h3>
                      <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider font-semibold">Active Node</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1.5 border shadow-sm ${isRisk ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                      {isRisk ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                      <span>{isRisk ? 'Critical' : 'Stable'}</span>
                    </div>
                  </div>
                  <div className="mt-8 flex items-baseline space-x-2 relative z-10">
                    <span className={`text-5xl font-extrabold tracking-tight font-display ${isRisk ? 'text-red-400' : 'text-white'}`}>
                      {stock}
                    </span>
                    <span className="text-slate-500 text-sm font-medium">units</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Insight Panel */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/5">
            <div className="flex items-center space-x-3 text-white">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <BrainCircuit className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold font-display">ChainMind Intelligence</h3>
            </div>
            {loadingInsight && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Analyzing</span>
              </div>
            )}
          </div>
          
          <div className="p-8 min-h-[200px]">
            {loadingInsight ? (
              <div className="flex flex-col space-y-4 animate-pulse">
                <div className="h-4 bg-white/10 rounded-md w-3/4"></div>
                <div className="h-4 bg-white/10 rounded-md w-full"></div>
                <div className="h-4 bg-white/10 rounded-md w-5/6"></div>
                <div className="h-4 bg-white/10 rounded-md w-4/5 mt-4"></div>
                <div className="h-4 bg-white/10 rounded-md w-full"></div>
              </div>
            ) : insight ? (
              <div className="prose prose-invert prose-blue max-w-none">
                {/* eslint-disable no-unused-vars */}
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h2 className="text-white mt-8 mb-4 font-bold text-2xl font-display flex items-center before:content-[''] before:block before:w-2 before:h-2 before:bg-blue-500 before:rounded-full before:mr-3" {...props} />,
                    h2: ({node, ...props}) => <h3 className="text-white mt-6 mb-3 font-bold text-xl font-display flex items-center before:content-[''] before:block before:w-2 before:h-2 before:bg-blue-500 before:rounded-full before:mr-3" {...props} />,
                    h3: ({node, ...props}) => <h4 className="text-white mt-5 mb-2 font-bold text-lg font-display flex items-center before:content-[''] before:block before:w-1.5 before:h-1.5 before:bg-blue-400 before:rounded-full before:mr-2" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4 text-slate-300 text-[15px] leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="mb-4 space-y-2 ml-5 list-disc marker:text-blue-500" {...props} />,
                    ol: ({node, ...props}) => <ol className="mb-4 space-y-2 ml-5 list-decimal marker:text-blue-500 text-slate-300" {...props} />,
                    li: ({node, ...props}) => <li className="text-slate-300 text-[15px] leading-relaxed pl-1" {...props} />,
                    strong: ({node, ...props}) => <strong className="text-white font-bold" {...props} />,
                    em: ({node, ...props}) => <em className="text-blue-200 italic" {...props} />,
                    code: ({node, inline, className, children, ...props}) => {
                      return inline ? (
                        <code className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono border border-blue-500/20" {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="block bg-black/40 text-slate-300 p-4 rounded-xl text-sm font-mono border border-white/10 overflow-x-auto mb-4" {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {insight}
                </ReactMarkdown>
                {/* eslint-enable no-unused-vars */}
                
                <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                  <button 
                    onClick={handleDownloadMitigationReport}
                    disabled={downloadingPDF}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {downloadingPDF ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />}
                    <span>{downloadingPDF ? 'Generating PDF...' : 'Download Mitigation Report'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10 opacity-70">
                <BrainCircuit className="h-12 w-12 mb-4 text-slate-600" />
                <p className="font-medium text-center max-w-sm">Trigger a simulation above to generate real-time actionable AI insights.</p>
              </div>
            )}
          </div>
        </div>

      </main>

    </div>
  );
}

export default Dashboard;
