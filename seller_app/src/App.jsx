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
  const fetchOrCreateProfile = async (user) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile fetch error:", error.message);
      return null;
    }

    // 🆕 If no profile → create one (SOCIAL LOGIN FIX)
    if (!data) {
      console.log("No profile found → creating one...");

      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        role: "seller",
        full_name: user.user_metadata?.full_name || "",
      });

      if (insertError) {
        console.error("Profile creation error:", insertError.message);
        return null;
      }

      return "seller";
    }

    return data.role;
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
        const userRole = await fetchOrCreateProfile(session.user);
        if (mounted) setRole(userRole);
      } else {
        setRole(null);
      }

      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session ?? null);

      if (session?.user) {
        const userRole = await fetchOrCreateProfile(session.user);
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
    if (role === null) {
      return (
        <div className="h-screen flex items-center justify-center text-red-500">
          Failed to load profile. Check database permissions.
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
