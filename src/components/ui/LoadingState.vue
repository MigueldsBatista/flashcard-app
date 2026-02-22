<script setup lang="ts">
import Card from '@/components/ui/Card.vue';
import { Loader2 } from 'lucide-vue-next';

defineProps<{
  message?: string;
}>();
</script>

<template>
  <Card class="p-12 text-center flex flex-col items-center justify-center min-h-[200px]">
    <Loader2 class="w-10 h-10 text-primary animate-spin mb-4" />
    <p class="text-muted-foreground">{{ message || 'Carregando...' }}</p>
  </Card>
</template>
