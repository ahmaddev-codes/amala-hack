"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MapPinIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import { BrandLogo } from "@/components/ui/brand-logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Added for signUp
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, user, isLoading: authLoading } = useAuth();
  const { success, error: showErrorToast, warning, info } = useToast();

  // Auto-redirect to map if authenticated
  useEffect(() => {
    console.log("🔍 Login page redirect check:", {
      hasUser: !!user,
      userEmail: user?.email,
      authLoading,
      shouldRedirect: user && !authLoading
    });
    
    if (user && !authLoading) {
      console.log("🚀 Redirecting to map from login page");
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isSignUp) {
        if (!name.trim()) {
          throw new Error("Name is required for sign up");
        }
        const result = await signUp(email, password, name);
        if (result.error) throw new Error(result.error);
        // Auto-redirect after successful sign-up
        router.push("/");
      } else {
        const result = await signIn(email, password);
        if (result.error) throw new Error(result.error);
        router.push("/");
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(""); // Clear any previous errors
    
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        // Show user-friendly error message
        if (result.error.includes("popup")) {
          showErrorToast(
            "Please allow popups for this site and try again, or check your browser settings.",
            "Popup Blocked"
          );
        } else if (result.error.includes("network")) {
          showErrorToast(
            "Please check your internet connection and try again.",
            "Network Error"
          );
        } else {
          showErrorToast(result.error, "Sign-in Error");
        }
        throw new Error(result.error);
      }
      
      // Success or redirect in progress
      console.log("🔄 Google auth initiated successfully");
      info("Signing you in with Google...", "Please Wait");
      
    } catch (error: any) {
      console.error("❌ Google auth error:", error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Desktop Layout with Video */}
      <div className="hidden lg:flex max-w-6xl w-full bg-white rounded-2xl overflow-hidden border border-gray-300">
        {/* Video Section */}
        <div className="flex-shrink-0 relative flex items-center justify-center p-6">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="h-auto max-h-[700px] object-contain rounded-xl"
          >
            <source src="/amala-intro.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Login Form Section */}
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <BrandLogo size="lg" variant="full" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-gray-600">
                {isSignUp
                  ? "Sign up to submit reviews and discover new Amala spots"
                  : "Sign in to your account to continue"}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-12 h-12 text-base"
                      required
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <EnvelopeIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <LockClosedIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>

            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full mt-4 border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="text-center text-sm mt-6">
              <p className="text-center text-sm text-gray-600">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
                <button
                  type="button"
                  className="ml-1 text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                  }}
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden w-full">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <BrandLogo size="lg" variant="full" />
            </div>
            <CardDescription className="text-center text-gray-600">
              {isSignUp
                ? "Create your account to start discovering amazing Amala spots"
                : "Sign in to discover the best Amala restaurants worldwide"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email-mobile">Email</Label>
                <div className="relative">
                  <EnvelopeIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email-mobile"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-mobile">Password</Label>
                <div className="relative">
                  <LockClosedIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password-mobile"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white" disabled={isLoading}>
                {isLoading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="text-center text-sm">
              <p className="text-gray-600">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-1 text-orange-600 hover:text-orange-700 font-medium transition-colors"
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
