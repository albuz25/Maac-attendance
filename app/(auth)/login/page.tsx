"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { GraduationCap, Loader2, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setDebugInfo("Starting login...");

    try {
      const supabase = createClient();
      setDebugInfo("Supabase client created, attempting sign in...");
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setDebugInfo(`Auth error: ${error.message}`);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message,
        });
        setIsLoading(false);
        return;
      }

      if (data.user) {
        setDebugInfo(`Signed in as ${data.user.email}, fetching role...`);
        
        // Get user role to determine redirect
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (userError) {
          setDebugInfo(`Error fetching role: ${userError.message}`);
          toast({
            variant: "destructive",
            title: "Error",
            description: `Could not fetch user role: ${userError.message}`,
          });
          setIsLoading(false);
          return;
        }

        setDebugInfo(`Role: ${userData?.role}, redirecting...`);

        toast({
          title: "Welcome back!",
          description: "Redirecting to your dashboard...",
        });

        // Small delay to show toast, then redirect
        setTimeout(() => {
          let redirectUrl = "/admin"; // Default for testing
          if (userData?.role === "ADMIN") {
            redirectUrl = "/admin";
          } else if (userData?.role === "CENTRE_MANAGER") {
            redirectUrl = "/centre-manager/batches";
          } else if (userData?.role === "FACULTY") {
            redirectUrl = "/faculty";
          }
          
          setDebugInfo(`Redirecting to ${redirectUrl}...`);
          window.location.href = redirectUrl;
        }, 500);
      } else {
        setDebugInfo("No user data returned");
        setIsLoading(false);
      }
    } catch (err: any) {
      setDebugInfo(`Exception: ${err?.message || String(err)}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
      setIsLoading(false);
    }
  };

  return (
    <Card className="animate-fade-in shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-4 text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
          <GraduationCap className="w-9 h-9 text-primary" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold tracking-tight">MAAC Attendance Portal</CardTitle>
          <CardDescription className="mt-2">
            Sign in to manage attendance for your center
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-11"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full h-11 text-base font-medium mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
        
        {/* Debug info - remove in production */}
        {debugInfo && (
          <div className="mt-4 p-3 bg-slate-100 rounded text-xs text-slate-600 break-all">
            Debug: {debugInfo}
          </div>
        )}
        
        <div className="mt-6 pt-6 border-t">
          <p className="text-xs text-center text-muted-foreground">
            MAAC Animation Academy
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
