import { Link } from 'react-router-dom';
import { Activity, BrainCircuit, ArrowRight, PackageOpen, Network } from 'lucide-react';

function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <PackageOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight font-display">ChainMind</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/login" state={{ isSignUp: true }} className="px-5 py-2.5 text-sm font-semibold bg-white text-slate-900 rounded-lg hover:bg-slate-200 transition-colors shadow-lg">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
            AI-Powered Digital Twin Technology
          </div>
          
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 font-display">
            Future-Proof Your <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Supply Chain
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-12 leading-relaxed">
            ChainMind creates a living, real-time digital twin of your warehouse network. Simulate disruptions, predict surges, and get actionable AI insights instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link 
              to="/login" 
              state={{ isSignUp: true }}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-900/50 transition-all flex items-center justify-center space-x-2 group"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all group">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Network className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 font-display">Dynamic Mapping</h3>
              <p className="text-slate-400 leading-relaxed">
                Configure your exact warehouse network. Map cities, define initial capacities, and view global stock levels in real-time.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all group">
              <div className="h-14 w-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity className="h-7 w-7 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 font-display">Surge Simulation</h3>
              <p className="text-slate-400 leading-relaxed">
                Stress-test your network. Target specific nodes with precise demand surge percentages to see how your supply chain reacts.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all group">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BrainCircuit className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 font-display">Gemini AI Insights</h3>
              <p className="text-slate-400 leading-relaxed">
                Powered by Google Gemini. Receive contextual, intelligent recommendations on stock redistribution the moment an anomaly occurs.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <PackageOpen className="h-6 w-6 text-blue-500" />
              <span className="text-xl font-bold tracking-tight font-display text-white">ChainMind</span>
            </div>
            
            <div className="flex space-x-8 text-sm font-medium text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Features</a>
              <a href="#" className="hover:text-white transition-colors">Pricing</a>
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
            <p>&copy; {new Date().getFullYear()} ChainMind Systems. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Home;
