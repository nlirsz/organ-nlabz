
import { AuthForm } from "@/components/auth/login-form";

interface AuthPageProps {
  onAuthSuccess: (token: string, userId: string, username: string) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  return <AuthForm onAuthSuccess={onAuthSuccess} />;
}
