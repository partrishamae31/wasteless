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

    setLoading(true); // Ensure loading is true while checking DB

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!data || error) {
      // 🚨 Bypassed profile creation detected
      await supabase.auth.signOut();

      setSession(null);
      setRole(null);
      setLoading(false); // Stop loading before showing alert

      alert(
        "Access Denied: Your Google email is not yet registered in our system. Please create an account first.",
      );
      setCurrentPage("login");
    } else {
      // ✅ Profile exists
      setSession(session);
      setRole(data.role);
      setLoading(false);
    }
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
      return (
        <SignUp
          onLoginClick={() => setCurrentPage("login")}
          isCompletingSocial={true}
        />
      );
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
