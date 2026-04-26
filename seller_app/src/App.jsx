import React, { useEffect, useState } from "react";
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
  };
  // 🔥 SINGLE SOURCE OF TRUTH
  const loadUser = async (session) => {
    if (!session?.user) {
      setSession(null);
      setRole(null);
      setLoading(false);
      return;
    }

    // Don't set the session yet! 
    // We only set it once we know they have a valid profile.
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!data || error) {
      console.warn("Unauthorized access: No profile found for this UID.");
      
      await supabase.auth.signOut(); 
      
      setSession(null);
      setRole(null);
      alert("Access Denied: You must register an account first. Social login is only for existing users.");
      setCurrentPage("login"); 
    } else {
      setSession(session);
      setRole(data.role);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    // INITIAL LOAD
    supabase.auth.getSession().then(({ data }) => {
      loadUser(data.session);
    });

    // LISTENER
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🔥 LOADING STATE (ONLY ONE)
  if (loading) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="w-12 h-12 border-4 border-[#769c2d] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-bold text-[#3285a1] animate-pulse uppercase tracking-widest text-xs">
        Syncing Wasteless Profile...
      </p>
    </div>
  );
}

  // 🔥 LOGGED IN
  if (session) {
    if (role === "NO_ROLE" || !role) {
    return <SignUp onLoginClick={() => setCurrentPage("login")} isCompletingSocial={true} />;
  }
    if (role === "seller") {
      return <SellerDashboard session={session} />;
    }

    if (role === "harvester") {
      return <HarvesterDashboard session={session} onLogout={handleLogout} />;
    }

    return (
      <div className="h-screen flex items-center justify-center">
        No role found. Please contact support.
      </div>
    );
  }

  // 🔥 LOGGED OUT
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
