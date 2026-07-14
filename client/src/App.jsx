import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged, database, ref, onValue } from './firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Settings from './pages/Settings';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaVerified, setMfaVerified] = useState(false);

  useEffect(() => {
    let unsubscribeMfa = () => {};
    
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const mfaRef = ref(database, `users/${currentUser.uid}/mfaEnabled`);
        unsubscribeMfa = onValue(mfaRef, (snapshot) => {
          const enabled = snapshot.val() || false;
          setMfaEnabled(enabled);
          
          const verified = sessionStorage.getItem(`mfa_verified_${currentUser.uid}`) === 'true';
          setMfaVerified(verified);
          setLoading(false);
        }, (err) => {
          console.error("Error reading mfaEnabled:", err);
          setMfaEnabled(false);
          setLoading(false);
        });
      } else {
        setMfaEnabled(false);
        setMfaVerified(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeMfa();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-xl font-display text-slate-300">Loading ChainMind...</div>
      </div>
    );
  }

  const requiresMfa = user && mfaEnabled && !mfaVerified;

  return (
    <Router>
      <Routes>
        <Route path="/" element={!user ? <Home /> : (requiresMfa ? <Navigate to="/login" /> : <Navigate to="/dashboard" />)} />
        <Route path="/login" element={!user ? <Login /> : (requiresMfa ? <Login forceMfa={true} onVerified={() => setMfaVerified(true)} /> : <Navigate to="/dashboard" />)} />
        <Route path="/dashboard" element={user ? (requiresMfa ? <Navigate to="/login" /> : <Dashboard user={user} />) : <Navigate to="/login" />} />
        <Route path="/settings" element={user ? (requiresMfa ? <Navigate to="/login" /> : <Settings user={user} />) : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;


