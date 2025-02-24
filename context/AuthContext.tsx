import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getRedirectURL = () => {
    if (Platform.OS === 'web') {
      return window.location.origin;
    }
    return 'community://';
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Welcome back!',
        text2: 'You have successfully signed in',
      });

      router.replace('/events');
    } catch (error: any) {
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    try {
      const firstName = fullName.split(' ')[0];
      
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            first_name: firstName,
          },
          emailRedirectTo: getRedirectURL(),
        },
      });

      if (signUpError) throw signUpError;

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          first_name: firstName,
        })
        .eq('id', data.user!.id);

      if (updateError) {
        console.error('Error updating user profile:', updateError);
      }

      Toast.show({
        type: 'success',
        text1: 'Welcome!',
        text2: 'Your account has been created successfully',
      });

      router.replace('/welcome');
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectURL() + '/update-password',
    });

    if (error) throw error;
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Signed out',
        text2: 'You have been signed out successfully',
      });

      router.replace('/sign-in');
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}