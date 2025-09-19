"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Person as User,
  Email,
  Lock,
  Google,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/FirebaseAuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
}

export function AuthModal({
  isOpen,
  onClose,
  mode,
  onModeChange,
}: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      let result;

      if (mode === "signin") {
        result = await signIn(formData.email, formData.password);
      } else {
        if (!formData.name.trim()) {
          setErrors({ name: "Name is required" });
          setLoading(false);
          return;
        }
        result = await signUp(formData.email, formData.password, formData.name);
      }

      if (result.error) {
        setErrors({ general: result.error });
      } else {
        if (mode === "signup") {
          setErrors({
            general: "Please check your email to confirm your account",
          });
        } else {
          onClose();
        }
      }
    } catch (error) {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrors({});

    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setErrors({ general: result.error });
      }
      // Note: Google OAuth redirects, so no need to close modal here
    } catch (error) {
      setErrors({ general: "Google sign in failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {mode === "signin"
              ? "Sign in to Amala Discovery"
              : "Join Amala Discovery"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Google Sign In */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            <Google className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange("name")}
                  placeholder="Enter your full name"
                  disabled={loading}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Email className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange("email")}
                placeholder="Enter your email"
                disabled={loading}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange("password")}
                  placeholder={
                    mode === "signin"
                      ? "Enter your password"
                      : "Create a password"
                  }
                  disabled={loading}
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <VisibilityOff className="w-4 h-4" />
                  ) : (
                    <Visibility className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {errors.general && (
              <div
                className={`p-3 text-sm rounded-md ${
                  errors.general.includes("check your email")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {errors.general}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "signin"
                ? "Sign In"
                : "Create Account"}
            </Button>
          </form>

          {/* Switch between signin/signup */}
          <div className="text-center text-sm">
            {mode === "signin" ? (
              <span>
                Don&apos;t have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => onModeChange("signup")}
                >
                  Sign up
                </Button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => onModeChange("signin")}
                >
                  Sign in
                </Button>
              </span>
            )}
          </div>

          <div className="text-xs text-center text-muted-foreground">
            {mode === "signin"
              ? "Sign in to leave reviews, upload photos, and discover more Amala spots!"
              : "Join our community to share your favorite Amala restaurants with the world!"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
