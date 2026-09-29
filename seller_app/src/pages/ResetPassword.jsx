import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import wastelessLogo from "./assets/wasteless-logo.png";

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
    let recoveryDetected = false;

    const finishRecoveryCheck = (ready, errorMessage = "") => {
      if (!mounted) return;

      setSessionReady(ready);

      if (errorMessage) {
        setErrorMsg(errorMessage);
      }

      setCheckingSession(false);
    };

    const checkRecoverySession = async () => {
      try {
        /*
         * Supabase recovery links can arrive before the PASSWORD_RECOVERY
         * auth event has fired. Give the auth listener a chance to establish
         * the recovery session first.
         */
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) return;

        if (data?.session) {
          finishRecoveryCheck(true);
          return;
        }

        /*
         * If there is no session yet, wait briefly for PASSWORD_RECOVERY.
         * This prevents a valid recovery link from being incorrectly
         * treated as expired.
         */
        setTimeout(async () => {
          if (!mounted || recoveryDetected) return;

          try {
            const { data: retryData, error: retryError } =
              await supabase.auth.getSession();

            if (retryError) throw retryError;

            if (retryData?.session) {
              finishRecoveryCheck(true);
            } else {
              finishRecoveryCheck(
                false,
                "Your password reset link is invalid, expired, or has already been used. Please request a new one."
              );
            }
          } catch (retryError) {
            console.error(
              "Recovery session retry error:",
              retryError
            );

            finishRecoveryCheck(
              false,
              "Unable to verify your reset link. Please request a new one."
            );
          }
        }, 1000);
      } catch (error) {
        console.error("Recovery session error:", error);

        finishRecoveryCheck(
          false,
          "Unable to verify your reset link. Please request a new one."
        );
      }
    };

    /*
     * PASSWORD_RECOVERY is the most important event here.
     *
     * Supabase establishes the temporary authenticated session
     * associated with the password reset link through this event.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === "PASSWORD_RECOVERY" && session) {
          recoveryDetected = true;

          setSessionReady(true);
          setErrorMsg("");
          setCheckingSession(false);

          return;
        }

        /*
         * Some Supabase configurations may emit SIGNED_IN while
         * processing the recovery link.
         */
        if (event === "SIGNED_IN" && session) {
          recoveryDetected = true;

          setSessionReady(true);
          setErrorMsg("");
          setCheckingSession(false);
        }
      }
    );

    checkRecoverySession();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    setErrorMsg("");
    setMessage("");

    const trimmedPassword = password;

    if (trimmedPassword.length < 6) {
      setErrorMsg(
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (trimmedPassword !== confirmPassword) {
      setErrorMsg("The passwords do not match.");
      return;
    }

    if (!sessionReady) {
      setErrorMsg(
        "Your password reset session is no longer valid. Please request a new reset link."
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error(
          "Your password could not be updated. Please request a new reset link."
        );
      }

      setMessage(
        "Your password has been updated successfully. Redirecting to login..."
      );

      setPassword("");
      setConfirmPassword("");

      /*
       * End the recovery session after the password has been changed.
       * This prevents the user from remaining inside the authenticated
       * application after completing the reset.
       */
      await supabase.auth.signOut();

      setTimeout(() => {
        window.location.replace("/");
      }, 1500);
    } catch (error) {
      console.error("Password update error:", error);

      setErrorMsg(
        error?.message ||
          "Unable to update your password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    window.location.replace("/");
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="w-full max-w-[420px] text-center">
          <img
            src={wastelessLogo}
            alt="Wasteless logo"
            className="mx-auto mb-5 h-20 w-20 object-contain"
          />

          <p className="text-sm text-gray-500">
            Verifying your password reset link...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 font-sans">
      <div className="w-full max-w-[420px]">
        <img
          src={wastelessLogo}
          alt="Wasteless logo"
          className="mb-4 h-20 w-20 object-contain"
        />

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
            <p className="mb-5 text-sm leading-6 text-gray-600">
              Your reset link is invalid, expired, or has already
              been used.
            </p>

            <button
              type="button"
              onClick={handleReturnToLogin}
              className="w-full rounded-xl bg-[#2587a2] py-3 text-sm font-semibold text-white transition hover:opacity-90"
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
                disabled={loading}
                placeholder="Enter new password"
                className="w-full rounded-xl border border-[#dce1e7] bg-[#f9fafb] px-4 py-3 text-sm outline-none transition focus:border-[#3295aa] focus:ring-2 focus:ring-[#3295aa]/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                disabled={loading}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-[#dce1e7] bg-[#f9fafb] px-4 py-3 text-sm outline-none transition focus:border-[#3295aa] focus:ring-2 focus:ring-[#3295aa]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#2d91a8] to-[#619d2d] py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Updating Password..."
                : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;