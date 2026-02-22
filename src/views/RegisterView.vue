<script setup lang="ts">
import { supabase } from '@/lib/supabase';
import { ref } from 'vue';

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const successMessage = ref('');

async function handleRegister() {
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords don't match";
    return;
  }

  loading.value = true;
  error.value = '';
  successMessage.value = '';

  const { error: authError } = await supabase.auth.signUp({
    email: email.value,
    password: password.value
  });

  if (authError) {
    error.value = authError.message;
  } else {
    // Create profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').insert({
        id: user.id
      });
    }
    successMessage.value = 'Registration successful! Please check your email to confirm your account.';
    // Don't redirect immediately so user sees the message
  }

  loading.value = false;
}
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-slate-900">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <!-- Logo -->
      <div class="flex justify-center">
        <svg
          class="h-16 w-16 text-blue-600 dark:text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      </div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
        Create your account
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
        Join Ultra Focus today
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-slate-700">
        <div
          v-if="successMessage"
          class="rounded-md bg-green-50 dark:bg-green-900/50 p-4 mb-6"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <!-- Heroicon name: solid/check-circle -->
              <svg
                class="h-5 w-5 text-green-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800 dark:text-green-200">
                Registration successful
              </h3>
              <div class="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>{{ successMessage }}</p>
              </div>
              <div class="mt-4">
                <router-link
                  to="/login"
                  class="text-sm font-medium text-green-800 hover:text-green-700 dark:text-green-200 dark:hover:text-green-100 underline"
                >
                  Go to Sign in
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <form
          v-else
          class="space-y-6"
          @submit.prevent="handleRegister"
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
                required
                v-model="password"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
              >
            </div>
          </div>

          <div>
            <label
              for="confirm-password"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirm Password
            </label>
            <div class="mt-1">
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                v-model="confirmPassword"
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
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
            >
              <span v-if="loading">Creating account...</span>
              <span v-else>Register</span>
            </button>
          </div>
        </form>

        <div
          v-if="!successMessage"
          class="mt-6"
        >
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300 dark:border-gray-600"/>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white dark:bg-slate-800 text-gray-500">
                Already have an account?
              </span>
            </div>
          </div>

          <div class="mt-6 text-center">
            <router-link
              to="/login"
              class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Sign in
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
