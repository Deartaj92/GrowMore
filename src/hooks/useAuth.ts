import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    loading: boolean;
}

export const useAuth = () => {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        loading: true,
    });

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setAuthState({
                user: session?.user ?? null,
                loading: false,
            });
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setAuthState({
                user: session?.user ?? null,
                loading: false,
            });
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return authState;
}; 