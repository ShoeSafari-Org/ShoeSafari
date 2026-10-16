"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { login, loginWithGoogle, resetPassword, signup } from "../../../lib/auth";
import { getSafeLoginRedirect } from "../../../lib/authRedirect";
import Toast from "../../../components/Toast";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import img from "../../../public/images/welcomeshoesafari.png"

const AuthPage = () => {
  const [toast, setToast] = useState({ show: false, message: "" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const googleLoginInFlight = useRef(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  const showToast = (message) => {
    setToast({ show: true, message });
  };

  const router = useRouter();
  const searchParams = useSearchParams();

  const getRedirectUrl = () => getSafeLoginRedirect(searchParams.get("redirect"));
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await login(email, password);
      setEmail("");
      setPassword("");
      showToast("Logged in successfully");
      router.push(getRedirectUrl());
    } catch (err) {
      showToast(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("Passwords do not match");
      return;
    }
    setIsSigningUp(true);
    try {
      await signup(email, password);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      showToast("User created successfully");
      router.push(getRedirectUrl());
    } catch (err) {
      showToast(err.message);
    } finally {
      setIsSigningUp(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      showToast("Enter your email address to request a password reset.");
      return;
    }
    setIsResettingPassword(true);
    try {
      await resetPassword(email.trim());
      showToast("If an account exists for that email, a password reset link will be sent.");
    } catch (err) {
      const message = err.message?.includes("auth/invalid-email")
        ? "Enter a valid email address."
        : "We couldn't send a reset link right now. Please try again.";
      showToast(message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoggingIn || isSigningUp || googleLoginInFlight.current) return;

    googleLoginInFlight.current = true;
    setIsGoogleLoggingIn(true);
    try {
      await loginWithGoogle();
      showToast("User logged in with Google successfully");
      router.push(getRedirectUrl());
    } catch (err) {
      showToast(err.message);
    } finally {
      googleLoginInFlight.current = false;
      setIsGoogleLoggingIn(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <section className="px-4 md:px-10 bg-white py-12 flex items-center justify-center min-h-screen">
      <div className="flex flex-wrap justify-center md:justify-between items-center w-full max-w-4xl">
        <div className="w-full md:w-1/2 flex justify-center md:justify-start mb-8 md:mb-0 md:pr-8">
        <Image src={img} alt="img"/>
        </div>
        <div className="w-full md:w-1/2 text-center md:text-left">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md mx-auto md:mx-0">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">
              {isLoginMode ? "Login" : "Create Account"}
            </h2>
            <form
              onSubmit={isLoginMode ? handleLogin : handleSignup}
              className="space-y-6"
            >
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter your email"
                  aria-label="Email"
                  required
                />
              </div>
              {isLoginMode && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                  aria-busy={isResettingPassword}
                  className="text-sm text-red-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-60"
                >
                  {isResettingPassword ? "Sending reset link..." : "Forgot password?"}
                </button>
              )}
              <div className="relative">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center pt-6 text-gray-500 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                >
                  {showPassword ? (
                    <FaRegEye aria-hidden="true" size={20} />
                  ) : (
                    <FaRegEyeSlash aria-hidden="true" size={20} />
                  )}
                </button>
              </div>
              {!isLoginMode && (
                <div className="relative">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Confirm Password
                  </label>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    aria-pressed={showConfirmPassword}
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center pt-6 text-gray-500 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    {showConfirmPassword ? (
                      <FaRegEye aria-hidden="true" size={20} />
                    ) : (
                      <FaRegEyeSlash aria-hidden="true" size={20} />
                    )}
                  </button>
                </div>
              )}
              <div>
                <button
                  type="submit"
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center justify-center"
                  disabled={isLoggingIn || isSigningUp || isGoogleLoggingIn}
                >
                  {isLoggingIn || isSigningUp ? (
                    <>
                      <AiOutlineLoading3Quarters className="animate-spin mr-2" />
                      {isLoginMode ? "Logging in..." : "Signing up..."}
                    </>
                  ) : isLoginMode ? (
                    "Login"
                  ) : (
                    "Signup"
                  )}
                </button>
              </div>
            </form>
            <span className="flex justify-center items-center py-2">Or</span>
            <div className="flex justify-center items-center">
              <button
                onClick={handleGoogleLogin}
                type="button"
                disabled={isLoggingIn || isSigningUp || isGoogleLoggingIn}
                aria-busy={isGoogleLoggingIn}
                className="w-full flex items-center bg-red-600 text-white py-2 px-4 rounded-md shadow-sm hover:bg-red-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isGoogleLoggingIn ? (
                  <AiOutlineLoading3Quarters
                    className="animate-spin mr-2"
                    aria-hidden="true"
                  />
                ) : (
                  <FcGoogle size={28} aria-hidden="true" />
                )}
                <span className="flex-grow text-center" aria-live="polite">
                  {isGoogleLoggingIn ? "Connecting to Google..." : "Continue with Google"}
                </span>
              </button>
            </div>
            <div className="mt-4 text-center text-gray-700">
              {isLoginMode ? (
                <>
                  Don't have an account?
                  <br />
                  <button
                    onClick={() => setIsLoginMode(false)}
                    className="font-serif hover:text-red-700 hover:underline focus:outline-none"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?
                  <br />
                  <button
                    onClick={() => setIsLoginMode(true)}
                    className="font-serif hover:text-red-700 hover:underline ring-0 focus:outline-none"
                  >
                    Login to your account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
      />
    </section>
  );
};

export default AuthPage;
