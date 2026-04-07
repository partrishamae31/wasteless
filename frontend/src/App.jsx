import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Ensure this path is correct
import Login from './pages/Login';
import SignUp from './pages/SignUp';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [session, setSession] = useState(null);

  useEffect(() => {
  // This listener catches the moment the popup finishes and the user is logged in
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth Event:", event);
    if (event === 'SIGNED_IN') {
      setSession(session);
    }
    if (event === 'SIGNED_OUT') {
      setSession(null);
    }
  });

  return () => subscription.unsubscribe();
}, []);

  // If Supabase finds a session (Google Login Success), show this instead
  if (session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <h1 className="text-2xl font-bold text-teal-700">Login Successful!</h1>
        <p className="text-gray-600 mt-2">Welcome, {session.user.email}</p>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="mt-6 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Otherwise, show the Login or Sign Up pages
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