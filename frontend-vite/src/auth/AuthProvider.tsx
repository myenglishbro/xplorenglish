import React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = Database["public"]["Enums"]["user_role"];

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  /** null mientras status !== "authenticated", o si la sesión es válida pero no existe fila en
   * `profiles` (ver profileError -- caso "perfil inexistente", nunca se auto-crea desde aquí). */
  profile: Profile | null;
  role: UserRole | null;
  /** true solo en el caso: hay sesión válida pero no hay fila en `profiles`. */
  profileMissing: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [profileMissing, setProfileMissing] = React.useState(false);

  // Id del usuario cuyo profile ya está cargado en memoria -- evita volver a pedir `profiles` en
  // TOKEN_REFRESHED / eventos repetidos para el mismo usuario. Es un ref (no state) a propósito:
  // el listener de onAuthStateChange se registra UNA vez (ver useEffect abajo, deps []) y necesita
  // leer el valor más reciente sin que ese cambio dispare un re-registro del listener.
  const loadedProfileForUserId = React.useRef<string | null>(null);

  const loadProfileFor = React.useCallback(async (userId: string) => {
    // Marca sincrónica ANTES del await: si el listener dispara dos veces seguidas para el mismo
    // usuario (p. ej. INITIAL_SESSION seguido de un SIGNED_IN inmediato), la segunda llamada ve
    // el marcador puesto y no dispara un segundo select a `profiles`.
    loadedProfileForUserId.current = userId;
    try {
      const p = await fetchProfile(userId);
      setProfile(p);
      setProfileMissing(p === null);
    } catch (err) {
      console.error("[AuthProvider] error cargando profile", err);
      setProfile(null);
      setProfileMissing(true);
    }
  }, []);

  const refreshProfile = React.useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;
    await loadProfileFor(userId);
  }, [session?.user.id, loadProfileFor]);

  React.useEffect(() => {
    // Una sola fuente de verdad: onAuthStateChange dispara "INITIAL_SESSION" inmediatamente al
    // suscribirse (con la sesión persistida en localStorage, o null si no hay ninguna) -- no hace
    // falta además un getSession() manual por separado, eso solo duplicaría la carga inicial.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        loadedProfileForUserId.current = null;
        setSession(null);
        setProfile(null);
        setProfileMissing(false);
        setStatus("unauthenticated");
        return;
      }

      setSession(newSession);
      setStatus("authenticated");

      // TOKEN_REFRESHED (mismo usuario) nunca vuelve a pedir profile -- es exactamente el
      // round-trip que los pilotos anteriores buscaban eliminar de la navegación normal. Solo se
      // vuelve a pedir si es un usuario distinto al que ya tenemos en memoria (login nuevo /
      // cambio de cuenta) o si todavía no se cargó ninguno (INITIAL_SESSION / primer SIGNED_IN).
      if (loadedProfileForUserId.current !== newSession.user.id) {
        void loadProfileFor(newSession.user.id);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listener se registra una sola vez a propósito
  }, []);

  const value: AuthContextValue = {
    status,
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    profileMissing,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext debe usarse dentro de <AuthProvider>");
  return ctx;
}
