import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import SellerDashboard from './pages/SellerDashboard';
import HarvesterDashboard from './pages/HarvesterDashboard';

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('login');

  const fetchRole = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle to avoid errors if profile is missing

    if (error) {
      console.error('Role fetch error:', error.message);
      return null;
    }
    return data?.role || null;
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setSession(session ?? null);

      if (session?.user) {
        setLoading(true); // Re-trigger loading when session changes
        let userRole = await fetchRole(session.user.id);

        // AUTO-CREATE PROFILE FOR SOCIAL LOGIN
        if (!userRole) {
          const savedRole = localStorage.getItem('pendingRole') || 'seller';
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{ 
              id: session.user.id, 
              role: savedRole, 
              email: session.user.email 
            }]);

          if (!insertError) userRole = savedRole;
          localStorage.removeItem('pendingRole');
        }
        
        setRole(userRole);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- REVISED RENDERING LOGIC ---

  // 1. Initial Load / Transition Loader
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d7a7f]"></div>
      </div>
    );
  }

  // 2. Logged In Logic
  if (session) {
    if (role === null) {
      // This prevents the white screen if the insert hasn't finished yet
      return (
        <div className="h-screen w-full flex items-center justify-center bg-white text-slate-500">
          Syncing profile...
        </div>
      );
    }

    return role === 'harvester'
      ? <HarvesterDashboard session={session} onLogout={handleLogout} />
      : <SellerDashboard session={session} onLogout={handleLogout} />;
  }

  // 3. Logged Out Logic
  return (
    <div className="App">
      {currentPage === 'login' ? (
        <Login onSignUpClick={() => setCurrentPage('signup')} />
      ) : (
        <SignUp onLoginClick={() => setCurrentPage('login')} />
      )}
    </div>
  );
}

export default App;