import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import SellerDashboard from './pages/SellerDashboard'; // Path from your file tree

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Use component tags <Component /> to avoid Hook errors
  if (session) {
  // ✅ DO THIS: Use the JSX tag. This provides the context Lucide needs.
  return <SellerDashboard session={session} />;
}

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