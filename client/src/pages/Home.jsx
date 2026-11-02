import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  BrainCircuit, 
  ArrowRight, 
  Network, 
  Menu, 
  X, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  Cpu, 
  Sparkles, 
  RefreshCw,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import Logo from '../components/Logo';

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Interactive Live Hero Simulation State
  const [demoState, setDemoState] = useState({
    surgeActive: false,
    simulating: false,
    puneStock: 85,
    mumbaiStock: 12500,
    delhiStock: 100000,
    mitigationApplied: false
  });

  const handleRunDemoSimulation = () => {
    if (demoState.simulating) return;
    setDemoState(prev => ({ ...prev, simulating: true }));

    setTimeout(() => {
      // Simulate surge impact on Pune DC
      setDemoState({
        surgeActive: true,
        simulating: false,
        puneStock: 24, // Drops to critical!
        mumbaiStock: 12500,
        delhiStock: 100000,
        mitigationApplied: false
      });

      // AI auto-mitigation kicks in after 1.4s
      setTimeout(() => {
        setDemoState(prev => ({
          ...prev,
          mitigationApplied: true,
          puneStock: 92, // Restored by reroute!
          mumbaiStock: 12432
        }));
      }, 1400);
    }, 800);
  };

  const handleResetDemo = () => {
    setDemoState({
      surgeActive: false,
      simulating: false,
      puneStock: 85,
      mumbaiStock: 12500,
      delhiStock: 100000,
      mitigationApplied: false
    });
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans overflow-hidden selection:bg-cyan-500/30 relative">
      
      {/* Background Cyber Grid & Ambient Glowing Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden cyber-grid opacity-70" />
      
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-cyan-600/15 blur-[150px]" />
        <div className="absolute top-[35%] right-[-15%] w-[45vw] h-[45vw] rounded-full bg-blue-600/15 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[180px]" />
      </div>

      {/* Floating Modern Header */}
      <nav className="sticky top-0 z-50 border-b border-cyan-500/10 bg-[#030712]/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <Logo size="md" />
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold tracking-tight font-display text-white group-hover:text-cyan-400 transition-colors">
                ChainMind
              </span>
              <span className="text-[10px] text-cyan-400/80 font-mono tracking-widest uppercase -mt-1 hidden sm:inline">
                Digital Twin Matrix
              </span>
            </div>
          </Link>
          
          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center space-x-5">
            <Link 
              to="/login" 
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/login" 
              state={{ isSignUp: true }} 
              className="relative group px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-linear-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
            >
              <span className="flex items-center space-x-2">
                <span>Launch Twin</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              aria-label="Toggle Navigation"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6 text-cyan-400" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="sm:hidden absolute top-20 left-0 w-full bg-[#030712]/95 backdrop-blur-2xl border-b border-cyan-500/20 shadow-2xl py-5 px-6 flex flex-col space-y-3 z-50 animate-in fade-in duration-150">
            <Link 
              to="/login" 
              className="px-4 py-3 text-base font-semibold text-slate-200 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-center border border-white/5"
            >
              Sign In
            </Link>
            <Link 
              to="/login" 
              state={{ isSignUp: true }} 
              className="px-4 py-3 text-base font-bold text-white bg-linear-to-r from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/30 text-center"
            >
              Launch Digital Twin
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16 text-center">
          
          {/* Glowing Pill Tag */}
          <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs sm:text-sm font-semibold mb-8 backdrop-blur-md shadow-lg shadow-cyan-500/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <span>Autonomous Supply Chain Digital Twin 2.0</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-normal hidden md:inline">Powered by Gemini AI & Leaflet</span>
          </div>
          
          {/* Master Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 font-display max-w-5xl mx-auto leading-[1.08]">
            Future-Proof Your <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-sky-300 to-blue-500 cyber-glow-cyan">
              Supply Chain Matrix
            </span>
          </h1>
          
          {/* Subtext */}
          <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-slate-300 mb-10 leading-relaxed font-normal">
            ChainMind crafts a living, real-time spatial digital twin of your logistics network. Stress-test multi-tier dependency chains, simulate extreme demand disruptions, and generate cognitive AI mitigation strategies before bottlenecks happen.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto sm:max-w-none">
            <Link 
              to="/login" 
              state={{ isSignUp: true }}
              className="w-full sm:w-auto px-8 py-4 bg-linear-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-2xl font-bold text-base sm:text-lg shadow-xl shadow-cyan-500/30 transition-all hover:-translate-y-1 flex items-center justify-center space-x-2.5 group cursor-pointer"
            >
              <span>Launch Live Twin</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a 
              href="#interactive-demo"
              className="w-full sm:w-auto px-7 py-4 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-2xl font-semibold text-base border border-white/10 hover:border-cyan-500/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>Interactive Simulator</span>
              <ChevronRight className="h-4 w-4 text-cyan-400" />
            </a>
          </div>

          {/* Interactive Live Mini Digital Twin Preview */}
          <div id="interactive-demo" className="mt-16 sm:mt-24 max-w-5xl mx-auto text-left scroll-mt-28">
            <div className="relative rounded-3xl bg-slate-900/70 border border-cyan-500/20 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5 relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/50" />
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
                    Active Telemetry • Multi-Tier Digital Twin
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunDemoSimulation}
                    disabled={demoState.simulating}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Activity className={`h-3.5 w-3.5 ${demoState.simulating ? 'animate-spin' : ''}`} />
                    <span>{demoState.simulating ? 'Simulating Surge...' : 'Inject +35% Disruption'}</span>
                  </button>
                  <button
                    onClick={handleResetDemo}
                    className="p-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all cursor-pointer"
                    title="Reset Simulation State"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* 3-Tier Multi-Node Network Pipeline Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8 relative z-10">
                
                {/* Node 1: Delhi Factory */}
                <div className="p-5 rounded-2xl bg-black/40 border border-cyan-500/20 relative group hover:border-cyan-400/50 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Tier 1 • Production</span>
                      <h4 className="text-lg font-bold text-white font-display">Delhi Giga-Factory</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Stable
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-white font-display">
                    {demoState.delhiStock.toLocaleString()} <span className="text-xs font-normal text-slate-400">units</span>
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-1">
                    <MapPin className="h-3 w-3 text-cyan-400" />
                    <span>28.6139° N, 77.2090° E</span>
                  </div>
                </div>

                {/* Node 2: Mumbai Regional Hub */}
                <div className="p-5 rounded-2xl bg-black/40 border border-indigo-500/20 relative group hover:border-indigo-400/50 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Tier 2 • Regional Hub</span>
                      <h4 className="text-lg font-bold text-white font-display">Mumbai West Hub</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Supplied by Delhi
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-white font-display">
                    {demoState.mumbaiStock.toLocaleString()} <span className="text-xs font-normal text-slate-400">units</span>
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-indigo-400" />
                    <span>1,415 km Corridor • 22.8 hrs transit</span>
                  </div>
                </div>

                {/* Node 3: Pune Distribution Center */}
                <div className={`p-5 rounded-2xl bg-black/40 border transition-all relative ${
                  demoState.puneStock < 80 
                    ? 'border-red-500/60 shadow-lg shadow-red-500/20 ring-1 ring-red-500/40' 
                    : 'border-purple-500/20 hover:border-purple-400/50'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Tier 3 • Distribution</span>
                      <h4 className="text-lg font-bold text-white font-display">Pune Local DC</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      demoState.puneStock < 80
                        ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {demoState.puneStock < 80 ? 'Critical Alert' : 'Target Ready'}
                    </span>
                  </div>
                  <div className={`text-3xl font-extrabold font-display ${demoState.puneStock < 80 ? 'text-red-400' : 'text-white'}`}>
                    {demoState.puneStock} <span className="text-xs font-normal text-slate-400">units</span>
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-1">
                    <ShieldAlert className={`h-3 w-3 ${demoState.puneStock < 80 ? 'text-red-400' : 'text-slate-400'}`} />
                    <span>Safety threshold: 80 units</span>
                  </div>
                </div>

              </div>

              {/* Real-time Dynamic AI Mitigation Banner in Preview */}
              {demoState.surgeActive && (
                <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-start space-x-3 animate-in fade-in duration-300">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-cyan-300">
                      {demoState.mitigationApplied ? 'Gemini AI Auto-Mitigation Applied' : 'Gemini AI Stress-Test Alert Triggered'}
                    </p>
                    <p className="text-slate-300 mt-1 leading-relaxed">
                      {demoState.mitigationApplied
                        ? 'Surgical re-routing completed: 68 units expedited via NH48 express freight corridor from Mumbai West Hub. Safety stock restored above 90 units.'
                        : 'Critical stock deficit detected at Pune Local DC (24 units < 80 threshold). Analyzing optimal freight re-routing corridors...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom Quick Metric strip */}
              <div className="mt-6 pt-5 border-t border-white/5 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  <span>Real-time spatial geocoding</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  <span>Sub-second Firebase synchronization</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  <span>Automated audit-ready PDF reporting</span>
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* High-Impact Capability Pillars */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-cyan-500/10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-cyan-400 mb-3">
              Engineered for Enterprise Resilience
            </h2>
            <h3 className="text-3xl sm:text-5xl font-extrabold text-white font-display">
              Autonomous Intelligence for Modern Supply Chains
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl hover:border-cyan-500/40 transition-all group hover:-translate-y-1 duration-300">
              <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                <MapPin className="h-7 w-7 text-cyan-400" />
              </div>
              <h4 className="text-2xl font-bold mb-3 font-display text-white">Geospatial Digital Twin</h4>
              <p className="text-slate-400 leading-relaxed text-sm">
                Map facilities onto an interactive Leaflet world canvas. Visualize transit corridors, road mileage, and estimated transit times across your global infrastructure.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl hover:border-sky-500/40 transition-all group hover:-translate-y-1 duration-300">
              <div className="h-14 w-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-sky-500/20 transition-all">
                <Activity className="h-7 w-7 text-sky-400" />
              </div>
              <h4 className="text-2xl font-bold mb-3 font-display text-white">Demand Surge Engine</h4>
              <p className="text-slate-400 leading-relaxed text-sm">
                Inject localized demand spikes and multi-tier disruptions. Watch stock deficits propagate dynamically through parent factories and distribution centers.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl hover:border-blue-500/40 transition-all group hover:-translate-y-1 duration-300">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
                <BrainCircuit className="h-7 w-7 text-blue-400" />
              </div>
              <h4 className="text-2xl font-bold mb-3 font-display text-white">Gemini Cognitive Dispatch</h4>
              <p className="text-slate-400 leading-relaxed text-sm">
                Harness Google Gemini AI to analyze critical deficits and recommend surgical redistribution actions, complete with instant PDF report generation via Doppio.
              </p>
            </div>

          </div>
        </div>

        {/* Call to Action Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="relative rounded-3xl bg-linear-to-r from-cyan-950/60 via-slate-900 to-blue-950/60 border border-cyan-500/20 p-8 sm:p-14 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <h3 className="text-3xl sm:text-5xl font-black text-white font-display mb-4">
              Ready to Stress-Test Your Logistics?
            </h3>
            <p className="text-slate-300 max-w-2xl mx-auto mb-8 text-base sm:text-lg">
              Launch your digital twin in seconds. Configure custom storage nodes, pinpoint locations on the map, and simulate surges with zero setup fees.
            </p>
            <Link 
              to="/login" 
              state={{ isSignUp: true }}
              className="inline-flex items-center space-x-2 px-8 py-4 bg-linear-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-cyan-500/30 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>

      </main>

      {/* Minimalist Clean Footer (As strictly requested: ChainMind and copyright line only) */}
      <footer className="relative z-10 border-t border-cyan-500/10 bg-[#030712] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <Logo size="sm" />
            <span className="text-lg font-bold tracking-tight font-display text-white">
              ChainMind
            </span>
          </div>
          
          <p className="text-xs text-slate-500 font-medium">
            &copy; {new Date().getFullYear()} ChainMind Systems. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
