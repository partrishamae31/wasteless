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

    setSession(session);
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Role error:", error.message);
      setRole("NO_ROLE");
    } else {
      setRole(data?.role || "NO_ROLE");
    }

    setLoading(false);
    if (data?.role) {
      setRole(data.role);
    } else {
      setCurrentPage("finish-profile");
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
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // 🔥 LOGGED IN
  if (session) {
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
