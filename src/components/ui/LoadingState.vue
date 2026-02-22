<script setup lang="ts">
import Card from '@/components/ui/Card.vue';
import { useTimeoutFn } from '@vueuse/core';
import { Loader2 } from 'lucide-vue-next';
import { ref } from 'vue';

const props = defineProps<{
  message?: string;
}>();

const phrases = [
  'Carregando seus flashcards...',
  'Preparando o baralho perfeito para você...',
  'Organizando seus cartões de estudo...',
  'Quase lá, preparando tudo para sua sessão de estudo...',
  'Carregando... A jornada do conhecimento está prestes a começar!'
];

const DELAY_MS = 1000;

const getRandomMessage = () =>
  phrases[Math.floor(Math.random() * phrases.length)] || props.message || 'Carregando...';

const msg = ref(props.message || getRandomMessage());

useTimeoutFn(() => msg.value = getRandomMessage(), DELAY_MS);
</script>

<template>
  <Card class="p-12 text-center flex flex-col items-center justify-center min-h-50">
    <Loader2 class="w-10 h-10 text-primary animate-spin mb-4" />
    <p class="text-muted-foreground">{{ msg }}</p>
  </Card>
</template>
