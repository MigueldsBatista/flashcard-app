<script setup lang="ts">
import type { Card } from '@/types/flashcard';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import MarkdownIt from 'markdown-it';
import { computed } from 'vue';
import OcclusionCardViewer from '@/components/OcclusionCardViewer.vue';

interface Props {
  card: Card;
  showAnswer: boolean;
}

const props = defineProps<Props>();

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight: (str: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (_) {}
    }
    return '';
  }
});

const isOcclusion = computed(() => props.card.content.type === 'occlusion');

const renderedFront = computed(() => {
  if (props.card.content.type === 'text') {
    return md.render(props.card.content.front);
  }
  return props.card.content.front;
});

const renderedBack = computed(() => {
  const content = props.card.content;

  switch (content.type) {
    case 'text':
      return md.render(content.back);

    case 'code':
      const lang = content.language || 'javascript';
      try {
        const highlighted = hljs.highlight(content.back, { language: lang }).value;
        return `<pre class="hljs rounded-lg p-4 overflow-x-auto"><code>${highlighted}</code></pre>`;
      } catch (_) {
        return `<pre class="bg-muted rounded-lg p-4 overflow-x-auto"><code>${content.back}</code></pre>`;
      }

    case 'image':
      return content.back;

    case 'occlusion':
      return ''; // Handled separately

    default:
      return md.render(content.back);
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- Occlusion Card Type -->
    <template v-if="isOcclusion">
      <div>
        <div class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Imagem com Oclusão
        </div>
        <div class="bg-muted/30 rounded-lg p-4">
          <OcclusionCardViewer
            v-if="card.content.imageData && card.content.imageOcclusions"
            :image-data="card.content.imageData"
            :occlusions="card.content.imageOcclusions"
            :interactive="true"
          />
        </div>
        <p class="text-xs text-muted-foreground mt-2 text-center">
          Clique nas áreas vermelhas para revelar o conteúdo
        </p>
      </div>
    </template>

    <!-- Regular Card Types -->
    <template v-else>
      <!-- Front (Question) -->
      <div>
        <div class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Pergunta
        </div>
        <div class="bg-muted/50 rounded-lg p-4">
          <div
            v-if="card.content.type === 'text'"
            class="prose dark:prose-invert"
            v-html="renderedFront"
          />
          <p
            v-else
            class="text-foreground"
          >
            {{ card.content.front }}
          </p>
        </div>
      </div>

      <!-- Back (Answer) -->
      <div v-if="showAnswer">
        <div class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Resposta
        </div>
        <div class="bg-muted/50 rounded-lg p-4">
          <!-- Image type -->
          <template v-if="card.content.type === 'image'">
            <div class="space-y-3">
              <div
                v-if="card.content.imageUrl"
                class="rounded-lg overflow-hidden border border-border"
              >
                <img
                  :src="card.content.imageUrl"
                  alt="Card content"
                  class="w-full max-h-96 object-contain bg-muted"
                >
              </div>
              <p class="text-foreground">{{ card.content.back }}</p>
            </div>
          </template>

          <!-- Other types with HTML rendering -->
          <template v-else>
            <div
              class="prose dark:prose-invert max-w-none"
              v-html="renderedBack"
            />
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
/* Highlight.js theme integration */
.hljs {
  background: #282c34 !important;
  color: #abb2bf;
}
</style>
