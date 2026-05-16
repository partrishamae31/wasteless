import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import SellerDashboard from "./pages/SellerDashboard";
import HarvesterDashboard from "./pages/HarvesterDashboard";
import AdminDashboard from "./admin/AdminDashboard";
import AdminPanel from "./admin/AdminPanel";

// --- ADDED IMPORTS ---
import EnvOfficerLogin from "./pages/EnvOfficerLogin";
import EnvOfficerPanel from "./wmo/EnvOfficerPanel";
import AdminLogin from "./pages/AdminLogin";

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("login");
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  // --- ADDED STATE FOR ENV OFFICER DEMO ---
  const [isEnvDemo, setIsEnvDemo] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setIsEnvDemo(false); // Reset demo state on logout
  };

  // 🔥 SINGLE SOURCE OF TRUTH
  const loadUser = async (session) => {
    setLoading(true);
    setIsChecked(false);

    if (!session?.user) {
      setSession(null);
      setRole(null);
      setLoading(false);
      setIsChecked(true);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!data || error || !data.role) {
      await supabase.auth.signOut();
      setSession(null);
      setRole(null);
      setIsUnauthorized(true);
      setCurrentPage("login");
    } else {
      setSession(session);
      setRole(data.role);
      setIsUnauthorized(false);
    }

    setLoading(false);
    setIsChecked(true);
  };
  useEffect(() => {
    // 🌍 DETECT LITERALLY TYPED URL PATHS (e.g., /admin or /wmo)
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view")?.toLowerCase();

    if (path === "/admin" || viewParam === "admin") {
      setCurrentPage("admin_login");
    } else if (path === "/wmo" || viewParam === "wmo") {
      setCurrentPage("env_login");
    }

    supabase.auth.getSession().then(({ data }) => {
      loadUser(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      loadUser(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🔥 LOADING STATE
  if (loading || !isChecked) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-12 h-12 border-4 border-[#769c2d] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-[#3285a1] animate-pulse uppercase tracking-widest text-xs">
          Syncing Wasteless Profile...
        </p>
      </div>
    );
  }

  // --- ADDED ENV OFFICER DASHBOARD VIEW ---
  // This shows if the role is officially 'env_officer' OR if the demo bypass is clicked
  if (isEnvDemo || role === "env_officer") {
    return <EnvOfficerPanel onLogout={handleLogout} user={session?.user} />;
  }

  if (isUnauthorized) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <p className="text-red-500 font-bold text-center">
          Access Denied: Email not registered.
        </p>
        <p className="text-gray-600 mt-2">
          Please create an account first before using Google login.
        </p>
        <button
          onClick={() => {
            setIsUnauthorized(false);
            setCurrentPage("signup");
          }}
          className="mt-4 px-4 py-2 bg-[#769c2d] text-white rounded"
        >
          Create Account
        </button>
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
    if (role === "admin") {
      return <AdminPanel session={session} onLogout={handleLogout} />;
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

  // 🔥 LOGGED OUT / NAVIGATION
  return (
    <div className="App">
      {currentPage === "login" && (
        <Login
          onSignUpClick={() => setCurrentPage("signup")}
          onEnvClick={() => setCurrentPage("env_login")}
        />
      )}
      {currentPage === "signup" && (
        <SignUp onLoginClick={() => setCurrentPage("login")} />
      )}
      {currentPage === "admin_login" && (
        <AdminLogin onBackToUserLogin={() => setCurrentPage("login")} />
      )}

      {/* --- ADDED ENV LOGIN PAGE --- */}
      {currentPage === "env_login" && (
        <EnvOfficerLogin
          onBackToUserLogin={() => setCurrentPage("login")}
          onLoginSuccess={() => setIsEnvDemo(true)}
        />
      )}
    </div>
  );
}

export default App;
