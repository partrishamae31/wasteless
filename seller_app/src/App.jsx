import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import SellerDashboard from "./pages/SellerDashboard";
import HarvesterDashboard from "./pages/HarvesterDashboard";

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("login");

  const fetchRole = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Role fetch error:", error.message);
      return null;
    }

    return data?.role || null;
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session ?? null);

      if (session?.user) {
        const userRole = await fetchRole(session.user.id);
        if (mounted) setRole(userRole);
      } else {
        setRole(null);
      }

      setLoading(false);
    };

    init();

    // Inside App.jsx - onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
  setSession(session ?? null);

  if (session?.user) {
    // 1. Try to fetch the role
    let userRole = await fetchRole(session.user.id);

    // 2. If the role is missing (first-time Google user), create the profile
    if (!userRole) {
      // Get the role the user clicked earlier (default to 'seller')
      const savedRole = localStorage.getItem('pendingRole') || 'seller'; 
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{ 
          id: session.user.id, 
          role: savedRole, 
          email: session.user.email 
        }]);

      if (!insertError) {
        userRole = savedRole;
        localStorage.removeItem('pendingRole'); // Clean up memory
      } else {
        console.error("Profile creation failed:", insertError.message);
      }
    }
    
    // 3. Set the role so the correct dashboard renders
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setCurrentPage("login");
  };

  // ✅ ONLY show loader when BOTH session + role are unknown on first load
  if (loading && session === null) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d7a7f]"></div>
      </div>
    );
  }

  // Logged in
  if (session) {
    if (!role) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-white text-slate-500">
          Loading role...
        </div>
      );
    }

    return role === "harvester" ? (
      <HarvesterDashboard session={session} onLogout={handleLogout} />
    ) : (
      <SellerDashboard session={session} onLogout={handleLogout} />
    );
  }

  // Logged out
  return (
    <div className="App">
      {currentPage === "login" ? (
        <Login onSignUpClick={() => setCurrentPage("signup")} />
      ) : (
        <SignUp onLoginClick={() => setCurrentPage("login")} />
      )}
    </div>
  );
}

export default App;
