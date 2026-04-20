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
    try {
      let attempts = 0;
      let role = null;

      while (attempts < 5 && !role) {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (!error && data?.role) {
          role = data.role;
          break;
        }

        await new Promise((res) => setTimeout(res, 500)); // wait 0.5s
        attempts++;
      }

      return role;
    } catch (err) {
      console.error("Role fetch error:", err.message);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session ?? null);
        if (session?.user) {
          const userRole = await fetchRole(session.user.id);
          setRole(userRole);
          if (!userRole) {
            setTimeout(async () => {
              const retryRole = await fetchRole(session.user.id);
              setRole(retryRole);
            }, 1000);
          }
        }
        setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setRole(null);
        return;
      }

      if (session?.user) {
        setSession(session); // Set session first
        const userRole = await fetchRole(session.user.id);
        setRole(userRole);
      }
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
  // Inside your App() component, under the session check:
  if (session) {
    if (role === null) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-white text-slate-500 gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2d7a7f]"></div>
          Validating Wasteless Account...
        </div>
      );
    }

    if (role === "seller") {
      return <SellerDashboard />;
    } else if (role === "harvester") {
      return <HarvesterDashboard />;
    }

    // Fallback for if a user exists but has no valid role
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Error: Role not assigned. Please contact support.</p>
      </div>
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