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
  /** true solo en el caso: hay sesión válida pero no hay fila en `profiles`, y no fue posible
   * completarlo automáticamente (ver profileProvisionError) o el usuario no es un autorregistro
   * pendiente. */
  profileMissing: boolean;
  /** Mensaje solo cuando el intento automático de completar un autorregistro (ver
   * completeSelfRegistrationIfPending) falló -- p. ej. DNI_ALREADY_REGISTERED. profileMissing
   * sigue en true en ese caso; esto es información adicional para mostrarla en /login. */
  profileProvisionError: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

interface SelfRegistrationMetadata {
  registration_source?: string;
  first_name?: string;
  last_name?: string;
  dni?: string;
  phone?: string;
  program_id?: number | null;
}

/**
 * Único puente entre /register (features/auth/hooks.ts) y complete_registration() (0011): si el
 * profile todavía no existe Y el user_metadata de este usuario trae registration_source='self'
 * (nunca lo setea admin-create-student, que solo pone first_name -- ver ese archivo), se asume que
 * es un autorregistro recién creado y se completa acá, una sola vez. Con "Confirm email"
 * deshabilitado esto ocurre en la misma sesión que crea signUp() (ver useRegisterStudent), sin
 * correo de por medio; si el proyecto alguna vez reactivara la confirmación de correo, esta misma
 * rama seguiría siendo correcta para cuando el usuario recién confirmado inicie sesión por primera
 * vez -- no depende de cuándo ocurra, solo de que el profile no exista todavía. Nunca toca el flujo
 * administrativo: un estudiante creado por admin jamás tiene registration_source='self' en su
 * user_metadata, así que esta rama simplemente no se ejecuta para ese caso.
 */
async function completeSelfRegistrationIfPending(user: User): Promise<{ profile: Profile | null; error: string | null }> {
  const metadata = user.user_metadata as SelfRegistrationMetadata;
  if (metadata?.registration_source !== "self") {
    return { profile: null, error: null };
  }

  const { data, error } = await supabase.rpc("complete_registration", {
    p_first_name: metadata.first_name ?? "",
    p_last_name: metadata.last_name ?? "",
    p_dni: metadata.dni ?? "",
    p_phone: metadata.phone ?? "",
    p_program_id: metadata.program_id ?? undefined,
  });

  if (error) {
    console.error("[AuthProvider] complete_registration falló", error);
    const code = error.message.split(":")[0]?.trim() ?? "";
    const message =
      code === "DNI_ALREADY_REGISTERED"
        ? "Este DNI ya está registrado en otra cuenta. Contacta a un administrador."
        : "No pudimos completar tu registro. Contacta a un administrador.";
    return { profile: null, error: message };
  }

  return { profile: data, error: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [profileMissing, setProfileMissing] = React.useState(false);
  const [profileProvisionError, setProfileProvisionError] = React.useState<string | null>(null);

  // Id del usuario cuyo profile ya está cargado en memoria -- evita volver a pedir `profiles` en
  // TOKEN_REFRESHED / eventos repetidos para el mismo usuario. Es un ref (no state) a propósito:
  // el listener de onAuthStateChange se registra UNA vez (ver useEffect abajo, deps []) y necesita
  // leer el valor más reciente sin que ese cambio dispare un re-registro del listener.
  const loadedProfileForUserId = React.useRef<string | null>(null);

  const loadProfileFor = React.useCallback(async (user: User) => {
    // Marca sincrónica ANTES del await: si el listener dispara dos veces seguidas para el mismo
    // usuario (p. ej. INITIAL_SESSION seguido de un SIGNED_IN inmediato), la segunda llamada ve
    // el marcador puesto y no dispara un segundo select a `profiles`.
    loadedProfileForUserId.current = user.id;
    setProfileProvisionError(null);
    try {
      let p = await fetchProfile(user.id);
      if (p === null) {
        // Único punto de contacto con complete_registration() -- ver esa función más arriba. No
        // hace nada si este usuario no es un autorregistro pendiente (registration_source!=='self').
        const result = await completeSelfRegistrationIfPending(user);
        if (result.error) setProfileProvisionError(result.error);
        p = result.profile;
      }
      setProfile(p);
      setProfileMissing(p === null);
    } catch (err) {
      console.error("[AuthProvider] error cargando profile", err);
      setProfile(null);
      setProfileMissing(true);
    }
  }, []);

  const refreshProfile = React.useCallback(async () => {
    const user = session?.user;
    if (!user) return;
    await loadProfileFor(user);
  }, [session?.user, loadProfileFor]);

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
        setProfileProvisionError(null);
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
        void loadProfileFor(newSession.user);
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
    profileProvisionError,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext debe usarse dentro de <AuthProvider>");
  return ctx;
}
