
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkRecoverySession = async () => {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        if (error) throw error;

        if (mounted) {
          setSessionReady(!!data.session);
        }
      } catch (error) {
        console.error("Recovery session error:", error);

        if (mounted) {
          setErrorMsg(
            "Unable to verify your reset link. Please request a new one."
          );
        }
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (
        event === "PASSWORD_RECOVERY" ||
        (event === "SIGNED_IN" && session)
      ) {
        setSessionReady(true);
        setErrorMsg("");
      }
    });

    checkRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    setErrorMsg("");
    setMessage("");

    if (password.length < 6) {
      setErrorMsg(
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setMessage("Your password has been updated successfully.");

      setPassword("");
      setConfirmPassword("");

      await supabase.auth.signOut();

      setTimeout(() => {
        window.location.replace("/");
      }, 1500);
    } catch (error) {
      console.error("Password update error:", error);

      setErrorMsg(
        error.message ||
          "Unable to update your password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <p className="text-sm text-gray-500">
          Verifying your password reset link...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 font-sans">
      <div className="w-full max-w-[420px]">

        <h1 className="mb-2 text-2xl font-bold text-[#182033]">
          Create a New Password
        </h1>

        <p className="mb-6 text-sm text-[#7c8494]">
          Enter your new password below.
        </p>

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
          >
            {errorMsg}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        {!sessionReady ? (
          <div>
            <p className="mb-5 text-sm text-gray-600">
              Your reset link is invalid, expired, or has already
              been used.
            </p>

            <button
              type="button"
              onClick={() => window.location.replace("/")}
              className="w-full rounded-xl bg-[#2587a2] py-3 text-sm font-semibold text-white"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form
            onSubmit={handlePasswordUpdate}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-semibold text-[#4d5667]"
              >
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                placeholder="Enter new password"
                className="w-full rounded-xl border border-[#dce1e7] bg-[#f9fafb] px-4 py-3 text-sm outline-none focus:border-[#3295aa] focus:ring-2 focus:ring-[#3295aa]/20"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-semibold text-[#4d5667]"
              >
                Confirm New Password
              </label>

              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                autoComplete="new-password"
                minLength={6}
                required
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-[#dce1e7] bg-[#f9fafb] px-4 py-3 text-sm outline-none focus:border-[#3295aa] focus:ring-2 focus:ring-[#3295aa]/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#2d91a8] to-[#619d2d] py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;