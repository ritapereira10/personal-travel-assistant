import { startLogin } from "@/const";
import { Plane } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-sm w-full">
        <div className="mb-10">
          <Plane className="w-7 h-7 mx-auto mb-6 text-muted-foreground" strokeWidth={1.5} />
          <h1 className="font-serif text-5xl font-bold text-foreground leading-tight mb-3">
            Rita's<br />Travel Journal
          </h1>
          <div className="w-12 h-px bg-editorial-rule mx-auto my-4" />
          <p className="font-sans text-sm text-muted-foreground tracking-wide">
            Private access only
          </p>
        </div>
        <button
          onClick={() => startLogin()}
          className="w-full bg-foreground text-background font-sans text-xs font-semibold tracking-widest uppercase px-6 py-3.5 hover:opacity-80 active:scale-[0.98] transition-all duration-150"
        >
          Sign In with Manus
        </button>
      </div>
    </div>
  );
}
