<script setup lang="ts">
import GoogleLogo from '@/components/icons/GoogleLogo.vue';
import UltraFocusLogo from '@/components/icons/UltraFocusLogo.vue';
import Button from '@/components/ui/Button.vue';
import { supabase } from '@/lib/supabase';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const router = useRouter();

async function handleLogin() {
  loading.value = true;
  error.value = '';

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });

  loading.value = false;

  if (!authError) {
    router.push('/');
    return;
  }

  if (authError.message === 'Email not confirmed') {
    error.value = 'Please check your email to confirm your account before logging in.';
  } else {
    error.value = authError.message;
  }
}

async function handleGoogleLogin() {
  loading.value = true;
  error.value = '';

  const { error: authError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`
    }
  });

  loading.value = false;

  if (authError) {
    error.value = authError.message;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-slate-900">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <!-- Logo -->
      <div class="flex justify-center">
        <ultra-focus-logo />
      </div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
        Ultra Focus
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
        Sign in to your account
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-slate-700">
        <form
          class="space-y-6"
          @submit.prevent="handleLogin"
        >
          <div>
            <label
              for="email"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email address
            </label>
            <div class="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                v-model="email"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
              >
            </div>
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <div class="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                v-model="password"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
              >
            </div>
          </div>

          <div
            v-if="error"
            class="rounded-md bg-red-50 dark:bg-red-900/50 p-4"
          >
            <div class="flex">
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
                  {{ error }}
                </h3>
              </div>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              :disabled="loading"
              size="md"
              class="w-full flex border border-transparent rounded-md shadow-sm text-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-blue-500 duration-200"
            >
              <span v-if="loading">Signing in...</span>
              <span v-else>Sign in</span>
            </Button>
          </div>
        </form>

        <!-- Divider -->
        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300 dark:border-gray-600"/>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white dark:bg-slate-800 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <div class="mt-6">
            <Button
              @click="handleGoogleLogin"
              :disabled="loading"
              variant="outline"
              size="md"
              class="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:border-slate-600 dark:text-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:focus:ring-offset-slate-800 disabled:opacity-50 transition-colors duration-200"
            >
              <google-logo />
              Sign in with Google
            </Button>
          </div>
        </div>

        <!-- Register link -->
        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300 dark:border-gray-600"/>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white dark:bg-slate-800 text-gray-500">
                New here?
              </span>
            </div>
          </div>

          <div class="mt-6 grid grid-cols-1 gap-3">
            <div class="text-center">
              <RouterLink
                to="/register"
                class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Create an account
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
