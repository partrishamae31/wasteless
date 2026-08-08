import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import SellerDashboard from "./pages/SellerDashboard";
import HarvesterDashboard from "./pages/HarvesterDashboard";
import AdminDashboard from "./admin/AdminDashboard";
import AdminPanel from "./admin/AdminPanel";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// --- ADDED IMPORTS ---
import EnvOfficerLogin from "./pages/EnvOfficerLogin";
import EnvOfficerPanel from "./wmo/EnvOfficerPanel";
import AdminLogin from "./pages/AdminLogin";
import AdminSignup from "./admin/AdminSignup";

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("login");
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  // --- ADDED STATE FOR ENV OFFICER DEMO ---
  const [isAdminDemo, setIsAdminDemo] = useState(false);

  const handleLogout = async () => {
  await supabase.auth.signOut();

  setSession(null);
  setRole(null);
  setIsAdminDemo(false);

  setIsSuspended(false);      // reset suspended state
  setCurrentPage("login");    // go back to login page
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
      .select("role, status")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!data || error || !data.role) {
      await supabase.auth.signOut();
      setSession(null);
      setRole(null);
      setIsUnauthorized(true);
      setCurrentPage("login");
    } else {
      const accountStatus = (data.status || "").toLowerCase();

      if (accountStatus === "suspended") {
  setIsSuspended(true);
  setSession(session);
  setRole(data.role);

  setLoading(false);
  setIsChecked(true);
  return;
}

      setSession(session);
      setRole(data.role);
      setIsUnauthorized(false);
    }

    setLoading(false);
    setIsChecked(true);
  };
  useEffect(() => {
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

  // 🔥 LOADING STATE
  if (loading && !session) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-12 h-12 border-4 border-[#769c2d] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-[#3285a1] animate-pulse uppercase tracking-widest text-xs">
          Syncing Wasteless Profile...
        </p>
      </div>
    );
  }
  if (isSuspended) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Account Suspended
        </h1>

        <p className="text-gray-600 mb-6">
          Your account has been suspended by the administrator.
          <br />
          You cannot use the application while your account is suspended.
        </p>

        <button
          onClick={handleLogout}
          className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

  // --- ADDED ENV OFFICER DASHBOARD VIEW ---
  // This shows if the role is officially 'env_officer' OR if the demo bypass is clicked
  if (isAdminDemo || role === "admin") {
    return <AdminPanel session={session} onLogout={handleLogout} />;
  }
  if (role === "env_officer") {
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
  if (session && role) {
    if (role === "NO_ROLE") {
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
    if (role === "repair_shop") {
      return <HarvesterDashboard session={session} onLogout={handleLogout} />;
    }

    if (role === "env_officer") {
      return <EnvOfficerPanel onLogout={handleLogout} user={session?.user} />;
    }
  }

  // 🔥 LOGGED OUT / NAVIGATION
  return (
    <BrowserRouter>
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

        {/* --- CONNECTED ADMIN LOGIN --- */}
        {currentPage === "admin_login" && (
          <AdminLogin
            onBackToUserLogin={() => setCurrentPage("login")}
            onLoginSuccess={() => {
              localStorage.setItem("adminAuthenticated", "true");
              setIsAdminDemo(true);
            }}
            onSignUpClick={() => setCurrentPage("admin_signup")}
          />
        )}
        {currentPage === "wmo_signup" && (
          <WMOSignup onLoginClick={() => setCurrentPage("env_login")} />
        )}

        {currentPage === "admin_signup" && (
          <AdminSignup onLoginClick={() => setCurrentPage("admin_login")} />
        )}

        {/* --- ENV LOGIN PAGE --- */}
        {currentPage === "env_login" && (
          <EnvOfficerLogin
            onBackToUserLogin={() => setCurrentPage("login")}
            onLoginSuccess={() => {
              // session listener will handle redirect
            }}
          />
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
