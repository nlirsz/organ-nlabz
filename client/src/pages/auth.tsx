
import { AuthForm } from "@/components/auth/login-form";

import { useLocation } from "wouter";

export default function AuthPage() {
  const [, setLocation] = useLocation();

  return <AuthForm onAuthSuccess={() => setLocation("/home")} />;
}
