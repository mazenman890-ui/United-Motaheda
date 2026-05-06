import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import LoginForm from "../auth/LoginForm";
import RegisterForm from "../auth/RegisterForm";
import AuthLayout from "../auth/AuthLayout";
import { AuthLoadingShell } from "../../components/ProtectedRoute";
import { useAuth } from "../../hooks/useAuth";

type AuthMode = "login" | "register";

function readFromState(state: unknown) {
  if (!state || typeof state !== "object" || !("from" in state)) {
    return "";
  }

  const from = (state as { from?: unknown }).from;
  return typeof from === "string" ? from : "";
}

function readMode(tab: string | null): AuthMode {
  return tab === "register" ? "register" : "login";
}

export default function Login() {
  const { loading, user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = readFromState(location.state);
  const mode = readMode(searchParams.get("tab"));
  const email = searchParams.get("email")?.trim() ?? "";
  const registrationComplete = searchParams.get("registered") === "1" && email.length > 0;

  const loginSearchParams = new URLSearchParams();
  loginSearchParams.set("tab", "login");
  if (email) {
    loginSearchParams.set("email", email);
  }
  if (registrationComplete) {
    loginSearchParams.set("registered", "1");
  }

  const registerSearchParams = new URLSearchParams();
  registerSearchParams.set("tab", "register");

  if (loading) {
    return <AuthLoadingShell />;
  }

  if (user) {
    let destination: string;
    switch (user.role) {
      case "admin":
        destination = "/admin";
        break;
      case "manager":
        destination = "/ops";
        break;
      case "pharmacist":
        destination = "/admin";
        break;
      case "driver":
        destination = "/driver";
        break;
      default:
        destination = from || "/";
    }
    return <Navigate to={destination} replace />;
  }

  return (
    <AuthLayout
      mode={mode}
      from={from}
      loginSearch={`?${loginSearchParams.toString()}`}
      registerSearch={`?${registerSearchParams.toString()}`}
    >
      {mode === "register" ? (
        <RegisterForm from={from} />
      ) : (
        <LoginForm
          defaultEmail={email}
          from={from}
          registrationComplete={registrationComplete}
        />
      )}
    </AuthLayout>
  );
}