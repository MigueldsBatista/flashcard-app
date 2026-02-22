<script setup lang="ts">
import CheckCircleIcon from '@/components/icons/CheckCircleIcon.vue';
import UltraFocusLogo from '@/components/icons/UltraFocusLogo.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
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
        <UltraFocusLogo />
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
            <div class="shrink-0">
              <CheckCircleIcon class="text-green-400" />
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
              <Input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                v-model="email"
              />
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
              <Input
                id="password"
                name="password"
                type="password"
                required
                v-model="password"
              />
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
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                v-model="confirmPassword"
              />
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
              class="w-full"
            >
              <span v-if="loading">Creating account...</span>
              <span v-else>Register</span>
            </Button>
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
