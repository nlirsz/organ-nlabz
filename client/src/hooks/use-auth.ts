import { useNavigate } from "react-router-dom";

export function useAuth() {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      // Call logout endpoint
      const authToken = localStorage.getItem("authToken");
      if (authToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "x-auth-token": authToken
          }
        });
      }
    } catch (error) {
      console.log("Erro no logout:", error);
    } finally {
      // Always clear local storage and redirect
      localStorage.removeItem("authToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      navigate("/auth");
    }
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem("authToken");
  };

  const getUserId = () => {
    return localStorage.getItem("userId");
  };

  const getUsername = () => {
    return localStorage.getItem("username");
  };

  return {
    logout,
    isAuthenticated,
    getUserId,
    getUsername
  };
}