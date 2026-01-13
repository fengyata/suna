'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';
import { clearUserLocalStorage } from '@/lib/utils/clear-local-storage';
import { useSunaModesStore } from '@/stores/suna-modes-store';
import { useRouter } from 'next/navigation';
// Auth tracking moved to AuthEventTracker component (handles OAuth redirects)

type AuthContextType = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (isLoading) setIsLoading(false);
        switch (event) {
          case 'SIGNED_IN':
            // Auth tracking handled by AuthEventTracker component via URL params
            break;
          case 'SIGNED_OUT':
            clearUserLocalStorage();
            break;
          case 'TOKEN_REFRESHED':
            break;
          case 'MFA_CHALLENGE_VERIFIED':
            break;
          default:
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]); // Removed isLoading from dependencies to prevent infinite loops

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear local storage after successful sign out
      clearUserLocalStorage();
    } catch (error) {
      console.error('❌ Error signing out:', error);
    }
  };

  const { selectedMode, setSelectedMode } = useSunaModesStore()
  useEffect(() => {

    const handleMessage = (event: MessageEvent) => {
      // console.log('Received message:', event.data);
      let data = event.data
      if (data.type == 'send_text') {
        sessionStorage.setItem('send_text', data.data.send_text)
      }
      // TODO: add init_superagent_data
      // if(data.type == 'init_superagent_data'){
      //   GlobalUserInfo.mainProjectData = {
      //     ...GlobalUserInfo.mainProjectData,
      //     ...data.data
      //   }
      //   console.log('init_superagent_data', GlobalUserInfo)
      // }
      if(data.type == 'superagent_router'){
        router.push(data.data.path)
      }
      if(data.type == 'superagent_selected_mode'){
        setSelectedMode(data.data.mode)
        router.push('/dashboard')
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({
      type: 'SUB_PROJECT_READY',
      message: '子项目已初始化完成',
      timestamp: Date.now(),
    }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const value = {
    supabase,
    session,
    user,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
