import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { readSignupProgress, clearSignupProgress } from "./signupProgress";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import SellerDashboard from "./pages/SellerDashboard";
import HarvesterDashboard from "./pages/HarvesterDashboard";
import AdminPanel from "./admin/AdminPanel";

// --- WMO / ADMIN / PASSWORD RECOVERY IMPORTS ---
import EnvOfficerLogin from "./pages/EnvOfficerLogin";
import EnvOfficerPanel from "./wmo/EnvOfficerPanel";
import AdminLogin from "./pages/AdminLogin";
import AdminSignup from "./admin/AdminSignup";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";

// Guards against out-of-order auth events (e.g. a transient session from
// admin account creation racing the restored one): only the newest
// loadUser call may update state.
let loadUserRunId = 0;

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("landing");
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [roleMismatch, setRoleMismatch] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // --- ADMIN DEMO / DIRECT ADMIN LOGIN STATE ---
  const [isAdminDemo, setIsAdminDemo] = useState(false);

  /*
   * IMPORTANT:
   * Password recovery is intentionally isolated from the normal
   * application authentication flow.
   *
   * Supabase creates a temporary recovery session when the user opens
   * the password-reset link. App must not immediately load the profile
   * and redirect that temporary session into a dashboard.
   */
  const isPasswordResetPath =
    window.location.pathname.toLowerCase() === "/reset-password";

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }

    setSession(null);
    setRole(null);
    setIsAdminDemo(false);
    setIsSuspended(false);
    setRoleMismatch(null);
    setVerificationStatus(null);
    setIsVerified(false);
    setSessionExpired(false);
    setIsUnauthorized(false);
    localStorage.removeItem("wasteless_signup_in_progress");
    setCurrentPage("login");
    setLoading(false);
    setIsChecked(true);
  };

  // ============================================================
  // SIGNUP-IN-PROGRESS GUARD
  // ============================================================
  // Email OTP verification creates a Supabase session. That session is
  // required by the signup flow, but it must NOT be treated as a normal
  // logged-in application session until the user explicitly logs in.
  const isSignupInProgress = () => {
    if (localStorage.getItem("wasteless_signup_in_progress") === "true") {
      return true;
    }

    const savedSignup = readSignupProgress();
    return Boolean(
      savedSignup?.step &&
      savedSignup.step >= 1 &&
      savedSignup.step <= 5 &&
      savedSignup?.formData?.email
    );
  };

  // ============================================================
  // SINGLE SOURCE OF TRUTH FOR NORMAL AUTHENTICATED USERS
  // ============================================================
  const loadUser = async (authSession) => {
    /*
     * NEVER process the normal user profile/dashboard flow while the
     * password recovery page is active.
     */
    if (isPasswordResetPath) {
      return;
    }

    // During registration, Supabase may have a valid session because the
    // email OTP was verified. Do not promote that temporary signup session
    // into the normal dashboard session.
    if (isSignupInProgress()) {
      setSession(null);
      setRole(null);
      setIsAdminDemo(false);
      setIsSuspended(false);
      setRoleMismatch(null);
      setIsUnauthorized(false);
      setCurrentPage("signup");
      setLoading(false);
      setIsChecked(true);
      return;
    }

    const runId = ++loadUserRunId;

    setLoading(true);
    setIsChecked(false);

    if (!authSession?.user) {
      setSession(null);
      setRole(null);
      setIsAdminDemo(false);
      setIsSuspended(false);
      setLoading(false);
      setIsChecked(true);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role, status, verification_status, is_verified")
      .eq("id", authSession.user.id)
      .maybeSingle();

    /*
     * A newer auth event superseded this call.
     * Skip the old result so a transient session can never overwrite
     * the current authenticated user.
     */
    if (
      runId !== loadUserRunId ||
      isPasswordResetPath ||
      isSignupInProgress()
    ) {
      return;
    }

    if (error) {
      console.error("Could not load profile:", error);

      setSession(authSession);
      setRole(null);
      setLoading(false);
      setIsChecked(true);
      return;
    }

    if (!data || !data.role) {
      /*
       * Email may be verified before the user finishes document
       * uploads. Keep the session so SignUp can continue.
       */
      setSession(authSession);
      setRole(null);
      setIsUnauthorized(false);
      setIsSuspended(false);
      setLoading(false);
      setIsChecked(true);
      return;
    }

    const accountStatus = (data.status || "").toLowerCase();

    // Check the role selected before social login.
    const selectedRole = localStorage.getItem(
      "wasteless_login_role"
    );

    if (selectedRole && selectedRole !== data.role) {
      const roleNames = {
        seller: "Seller",
        harvester: "Second-Hand Electronics Owner/Dealer",
        repair_shop: "Repair Shop",
        env_officer: "Waste Management Officer",
        admin: "Administrator",
      };

      setRoleMismatch({
        selected: roleNames[selectedRole] || selectedRole,
        registered: roleNames[data.role] || data.role,
      });

      // TC_REG_12/13: a selected role must match the role stored in the
      // authenticated profile. Do not allow the dashboard to render.
      setIsUnauthorized(true);
      localStorage.removeItem("wasteless_login_role");

      await supabase.auth.signOut();

      if (runId !== loadUserRunId || isPasswordResetPath) {
        return;
      }

      setSession(null);
      setRole(null);
      setIsAdminDemo(false);
      setLoading(false);
      setIsChecked(true);

      return;
    }

    // Clear temporary signup/login state once a real profile has
    // successfully authenticated. Otherwise a stale signup-progress
    // record can force App back to the Create Account screen after
    // a browser refresh.
    clearSignupProgress();

    // The in-memory page is only navigation state. Once authentication
    // has been restored, the authenticated role is the source of truth.
    setCurrentPage("landing");

    // Clear the saved role after a successful match.
    if (selectedRole) {
      localStorage.removeItem("wasteless_login_role");
    }

    if (accountStatus === "suspended") {
      setIsSuspended(true);
      setSession(authSession);
      setRole(data.role);

      setLoading(false);
      setIsChecked(true);
      return;
    }

    setIsSuspended(false);
    setSession(authSession);
    setRole(data.role);
    setVerificationStatus(String(data.verification_status || "pending").toLowerCase());
    setIsVerified(Boolean(data.is_verified) || ["verified", "approved"].includes(String(data.verification_status || "").toLowerCase()));
    setSessionExpired(false);
    setIsUnauthorized(false);

    setLoading(false);
    setIsChecked(true);
  };

  // ============================================================
  // INACTIVITY SESSION TIMEOUT
  // ============================================================
  // TC_REG_14: automatically sign the user out after 30 minutes of
  // inactivity and return them to Login with an expiry message.
  useEffect(() => {
    if (!session?.user || !role || isPasswordResetPath) return undefined;

    const TIMEOUT_MS = 30 * 60 * 1000;
    let timer;

    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.warn("Session timeout sign-out error:", error);
        }

        setSession(null);
        setRole(null);
        setVerificationStatus(null);
        setIsVerified(false);
        setIsSuspended(false);
        setRoleMismatch(null);
        setIsUnauthorized(false);
        setSessionExpired(true);
        setCurrentPage("landing");
        setLoading(false);
        setIsChecked(true);
      }, TIMEOUT_MS);
    };

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart", "pointerdown"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      window.clearTimeout(timer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [session?.user?.id, role, isPasswordResetPath]);

  // ============================================================
  // INITIAL ROUTING + NORMAL AUTH LISTENER
  // ============================================================
  useEffect(() => {
    /*
     * PASSWORD RECOVERY IS COMPLETELY SEPARATE.
     *
     * Do not call getSession() here and do not register the normal
     * application auth listener while ResetPassword is mounted.
     *
     * ResetPassword.jsx owns the PASSWORD_RECOVERY listener and
     * recovery-session validation.
     */
    if (isPasswordResetPath) {
      setLoading(false);
      setIsChecked(true);
      return undefined;
    }

    // A signup session is intentionally kept by Supabase between OTP
    // verification and final document/profile submission. The normal auth
    // listener must not turn that session into a dashboard login.
    if (isSignupInProgress()) {
      setCurrentPage("signup");
    }

    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view")?.toLowerCase();

    if (path === "/admin" || viewParam === "admin") {
      setCurrentPage("admin_login");
    } else if (path === "/wmo" || viewParam === "wmo") {
      setCurrentPage("env_login");
    } else {
      const savedSignup = readSignupProgress();

      if (savedSignup?.step && savedSignup?.formData?.email) {
        setCurrentPage("signup");
      }
    }

    let mounted = true;

    /*
     * Restore the normal application session.
     */
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;

        if (error) {
          console.error("Initial auth session error:", error);
          loadUser(null);
          return;
        }

        loadUser(data?.session || null);
      })
      .catch((error) => {
        console.error("Initial auth session exception:", error);

        if (mounted) {
          loadUser(null);
        }
      });

    /*
     * Listen for normal login/logout/session-refresh events.
     *
     * PASSWORD_RECOVERY is intentionally ignored here because the
     * recovery page is handled by ResetPassword.jsx. The pathname
     * guard above prevents this listener from being created when
     * the application is already on /reset-password.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (!mounted || isPasswordResetPath) return;

      if (event === "PASSWORD_RECOVERY") {
        return;
      }

      // OTP verification and other signup operations can emit auth events.
      // While signup progress exists, keep App on the signup flow.
      if (isSignupInProgress()) {
        setSession(null);
        setRole(null);
        setIsAdminDemo(false);
        setIsSuspended(false);
        setRoleMismatch(null);
        setIsUnauthorized(false);
        setCurrentPage("signup");
        setLoading(false);
        setIsChecked(true);
        return;
      }

      loadUser(authSession);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // ============================================================
  // PASSWORD RESET PAGE
  // ============================================================
  /*
   * This check MUST happen before the normal loading/authentication
   * screens. ResetPassword owns the recovery session from here.
   */
  if (isPasswordResetPath) {
    return <ResetPassword />;
  }

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading && !session && currentPage !== "signup") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-12 h-12 border-4 border-[#769c2d] border-t-transparent rounded-full animate-spin mb-4"></div>

        <p className="font-bold text-[#3285a1] animate-pulse uppercase tracking-widest text-xs">
          Syncing Wasteless Profile...
        </p>
      </div>
    );
  }

  // ============================================================
  // SUSPENDED ACCOUNT
  // ============================================================
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

  // ============================================================
  // ADMIN / WMO DIRECT DASHBOARDS
  // ============================================================
  if (isAdminDemo || role === "admin") {
    return (
      <AdminPanel
        session={session}
        onLogout={handleLogout}
      />
    );
  }

  if (role === "env_officer") {
    return (
      <EnvOfficerPanel
        onLogout={handleLogout}
        user={session?.user}
      />
    );
  }

  // ============================================================
  // UNAUTHORIZED / WRONG ROLE
  // ============================================================
  if (isUnauthorized) {
    // Wrong role selected during social login.
    if (roleMismatch) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
          <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
            <div className="text-red-500 text-3xl mb-4">
              ✕
            </div>

            <h1 className="text-xl font-bold text-red-600 mb-3">
              Wrong Role Selected
            </h1>

            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              You selected{" "}
              <strong>{roleMismatch.selected}</strong>, but
              this account is registered as{" "}
              <strong>{roleMismatch.registered}</strong>.
              Please select the correct role to sign in.
            </p>

            <button
              onClick={() => {
                // Return to the normal Login screen. The generic
                // unauthorized state must also be cleared; otherwise
                // clearing only roleMismatch makes App fall through to
                // the "Email not registered" screen.
                setRoleMismatch(null);
                setIsUnauthorized(false);
                setSessionExpired(false);
                localStorage.removeItem("wasteless_login_role");
                setCurrentPage("login");
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2d91a8] to-[#619d2d] text-white font-semibold text-sm"
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }

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
            clearSignupProgress();
            localStorage.setItem("wasteless_signup_in_progress", "true");
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

  // ============================================================
  // SIGNUP
  // ============================================================
  // A stale signup-progress record may set currentPage to "signup"
  // during the first render while Supabase is restoring an existing
  // authenticated session. Do not let that screen override a valid
  // logged-in session.
  if (currentPage === "signup" && (!session?.user || !role)) {
    return (
      <SignUp
        onLoginClick={() => {
          clearSignupProgress();
          localStorage.removeItem("wasteless_signup_in_progress");
          setSession(null);
          setRole(null);
          setCurrentPage("login");
        }}
      />
    );
  }

  // ============================================================
  // LOGGED IN
  // ============================================================
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
      return (
        <AdminPanel
          session={session}
          onLogout={handleLogout}
        />
      );
    }

    if (role === "harvester") {
      return (
        <SellerDashboard
          session={session}
          onLogout={handleLogout}
          verificationStatus={verificationStatus}
          isVerified={isVerified}
          readOnly={!isVerified}
        />
      );
    }

    if (role === "repair_shop") {
      return (
        <HarvesterDashboard
          session={session}
          onLogout={handleLogout}
          verificationStatus={verificationStatus}
          isVerified={isVerified}
          readOnly={!isVerified}
        />
      );
    }

    if (role === "env_officer") {
      return (
        <EnvOfficerPanel
          onLogout={handleLogout}
          user={session?.user}
        />
      );
    }
  }

  // ============================================================
  // LOGGED OUT / NAVIGATION
  // ============================================================
  return (
    <div className="App">
      {sessionExpired && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 shadow-lg"
        >
          Your session has expired due to inactivity. Please sign in again.
        </div>
      )}
      {currentPage === "landing" && (
  <Landing
    onGetStarted={() => setCurrentPage("login")}
    onSignUp={() => {
      clearSignupProgress();
      localStorage.setItem("wasteless_signup_in_progress", "true");
      setCurrentPage("signup");
    }}
  />
)}

      {currentPage === "login" && (
        <Login
          onBackToHome={() => setCurrentPage("landing")}

          onSignUpClick={() => {
            clearSignupProgress();
            localStorage.setItem("wasteless_signup_in_progress", "true");
            setCurrentPage("signup");
          }}
          onEnvClick={() => setCurrentPage("env_login")}
        />
      )}

      {currentPage === "signup" && (
        <SignUp
          onLoginClick={() => {
            clearSignupProgress();
            localStorage.removeItem("wasteless_signup_in_progress");
            setSession(null);
            setRole(null);
            setCurrentPage("login");
          }}
        />
      )}

      {/* ======================================================
          ADMIN LOGIN
          ====================================================== */}
      {currentPage === "admin_login" && (
        <AdminLogin
          onBackToUserLogin={() => setCurrentPage("login")}
          onLoginSuccess={() => {
            localStorage.setItem(
              "adminAuthenticated",
              "true"
            );

            setIsAdminDemo(true);
            setCurrentPage("login");
          }}
          onSignUpClick={() => setCurrentPage("admin_signup")}
        />
      )}

      {/* ======================================================
          ADMIN SIGNUP
          ====================================================== */}
      {currentPage === "admin_signup" && (
        <AdminSignup
          onLoginClick={() => setCurrentPage("admin_login")}
        />
      )}

      {/* ======================================================
          WMO LOGIN
          ====================================================== */}
      {currentPage === "env_login" && (
        <EnvOfficerLogin
          onBackToUserLogin={() => setCurrentPage("login")}
          onLoginSuccess={() => {
            setCurrentPage("env_login");
          }}
        />
      )}
    </div>
  );
}

export default App;
