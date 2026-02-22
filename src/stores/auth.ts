import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const router = useRouter();
  const loading = ref(true);

  async function initializeAuth() {
    loading.value = true;
    const { data: { session } } = await supabase.auth.getSession();
    user.value = session?.user ?? null;

    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null;
      if (!user.value) {
        router.push('/login');
      }
    });
    loading.value = false;
  }

  async function signOut() {
    await supabase.auth.signOut();
    user.value = null;
    router.push('/login');
  }

  return {
    user,
    loading,
    initializeAuth,
    signOut
  };
});
