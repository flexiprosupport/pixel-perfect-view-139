import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, Wallet, AppRole } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  wallet: Wallet | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  // ALWAYS start loading as true to avoid redirecting before Supabase fetch completes
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [profileResult, walletResult, roleResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);

      if (profileResult.data) setProfile(profileResult.data as unknown as Profile);
      if (walletResult.data) setWallet(walletResult.data as Wallet);
      if (roleResult.data?.length) {
        const roles = roleResult.data.map((item) => item.role as AppRole);
        setRole(roles.includes('admin') ? 'admin' : roles[0]);
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  // Set up realtime subscription for wallet updates
  useEffect(() => {
    if (!user) return;

    const walletChannel = supabase
      .channel(`wallet-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            setWallet(payload.new as Wallet);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;
    let initialLoadDone = false;

    // Listener for ONGOING auth changes - does NOT control isLoading
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        // Only fetch user data on ONGOING changes (not initial)
        // Initial load is handled by initializeAuth below
        if (initialLoadDone) {
          if (session?.user) {
            fetchUserData(session.user.id);
          } else {
            setProfile(null);
            setWallet(null);
            setRole(null);
          }
        }
      }
    );

    // INITIAL load - controls isLoading, fetches data ONCE
    // Has a 10-second safety timeout to prevent infinite freeze
    const initializeAuth = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timed out')), 10000)
        );

        const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
        if (!isMounted) return;

        const session = result?.data?.session ?? null;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch user data with its own timeout
          try {
            await Promise.race([
              fetchUserData(session.user.id),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Data fetch timed out')), 10000))
            ]);
          } catch (e) {
            console.warn('User data fetch timed out, will retry on next action');
          }
        }
      } catch (err) {
        console.warn('initializeAuth timed out or failed:', err);
        // Still allow the page to render (show login form)
      } finally {
        if (isMounted) {
          setIsLoading(false);
          initialLoadDone = true;
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    console.log('--- useAuth: signIn started ---');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('--- useAuth: signIn error ---', error.message);
        return { error: error as Error };
      }

      console.log('--- useAuth: signIn success ---');
      return { error: null };
    } catch (error) {
      console.error('--- useAuth: signIn catch ---', error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    console.log('--- useAuth: signUp started ---');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName || '' },
        },
      });

      if (error) {
        console.error('--- useAuth: signUp error ---', error.message);
        return { error: error as Error };
      }

      // If email confirmation is off, sign the user in immediately.
      const signInRes = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInRes.error) {
        // Not fatal — account exists but requires email confirmation.
        console.warn('--- useAuth: post-signup signIn ---', signInRes.error.message);
      }

      return { error: null };
    } catch (error) {
      console.error('--- useAuth: signUp catch ---', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setWallet(null);
      setRole(null);
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear local state even if sign out fails
      setProfile(null);
      setWallet(null);
      setRole(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) setProfile(data as unknown as Profile);
    }
  };

  const refreshWallet = async () => {
    if (user) {
      const { data } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) setWallet(data as Wallet);
    }
  };

  const value = {
    user,
    session,
    profile,
    wallet,
    role,
    isLoading,
    isAdmin: role === 'admin',
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshWallet,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
