import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, type PublicUser } from "@/lib/api";

/**
 * Stato di autenticazione condiviso da header, modali e pagine.
 *
 * Il token di sessione vive in un cookie HttpOnly: JavaScript non puo' leggerlo,
 * quindi l'unica fonte di verita' è l'endpoint /api/me. Al caricamento lo
 * interroghiamo per capire se c'è una sessione aperta; se risponde 401 il
 * cookie e' scaduto e azzera lo stato locale.
 */

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (input: Parameters<typeof api.register>[0]) => Promise<PublicUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const { user: me } = await api.me();
      setUser(me);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: logged } = await api.login({ email, password });
    setUser(logged);
    setStatus("authenticated");
    return logged;
  }, []);

  const register = useCallback(async (input: Parameters<typeof api.register>[0]) => {
    const { user: created } = await api.register(input);
    setUser(created);
    setStatus("authenticated");
    return created;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      // Anche se la chiamata fallisce, lo stato locale va azzerato: l'utente
      // ha chiesto di uscire e non deve continuare a vedere il proprio account.
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout, refresh }),
    [status, user, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Legge il context. Va usato solo dentro AuthProvider. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve stare dentro AuthProvider.");
  return context;
}
