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
      .maybeSingle();

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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;
      setSession(session ?? null);

      if (session?.user) {
        const userRole = await fetchRole(session.user.id);
        if (mounted) setRole(userRole);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session ?? null);

      if (session?.user) {
        setLoading(true); // Show loader while checking/fixing role
        let userRole = await fetchRole(session.user.id);

        if (userRole === null) {
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
            localStorage.removeItem('pendingRole');
          } else {
            console.error("Profile creation failed:", insertError.message);
          }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setCurrentPage("login");
  };

  // --- RENDERING LOGIC ---

  // 1. Initial Application Load
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d7a7f]"></div>
      </div>
    );
  }

  // 2. Not Logged In
  if (!session) {
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

  // 3. Logged in but Role Profile is still being created/fetched
  if (session && role === null) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d7a7f] mx-auto mb-4"></div>
           <p className="text-gray-500">Setting up your {localStorage.getItem('pendingRole') || 'account'}...</p>
        </div>
      </div>
    );
  }

  // 4. Logged In & Role Ready
  return role === "harvester" ? (
    <HarvesterDashboard session={session} onLogout={handleLogout} />
  ) : (
    <SellerDashboard session={session} onLogout={handleLogout} />
  );
}

export default App;