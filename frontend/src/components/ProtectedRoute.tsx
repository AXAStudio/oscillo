// /src/components/ProtectedRoute.tsx
import { useEffect, useState, type PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/api";

export default function ProtectedRoute({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<"loading" | "authed" | "anon">("loading");

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setStatus(session ? "authed" : "anon");
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
        setStatus(s ? "authed" : "anon")
      );
      unsub = () => subscription.unsubscribe();
    })();
    return () => unsub();
  }, []);

  if (status === "loading") {
    return <div className="p-8 text-muted-foreground">Checking session…</div>;
  }
  return status === "authed" ? <>{children}</> : <Navigate to="/auth" replace />;
}
