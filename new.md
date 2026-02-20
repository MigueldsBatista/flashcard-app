## 6. Share Data (Web Share API)

Para compartilhar estatísticas e retenção estimada conforme o seu **RF10**:

* **Funcionalidade:** Utilize a `navigator.share()` API. Ela abre a gaveta de compartilhamento nativa do sistema (WhatsApp, Instagram, etc.).
* **Exemplo no Vue:**
```javascript
const compartilharProgresso = async () => {
  await navigator.share({
    title: 'Meu progresso no Ultra Focus',
    text: `Hoje graduei ${cardsGraduados} cartões!`,
    url: 'https://focus-app.vercel.app'
  });
};

```

## 4. Offline Support

Este é um requisito crítico do seu PRD (**RF09**).

* **Estratégia:** O `vite-plugin-pwa` usa o Workbox para gerenciar o cache.
* **Configuração:**
```javascript
workbox: 
  globPatterns: ['**/*.{js,css,html,ico,png,svg}'], // Cache automático de arquivos estáticos
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api'),
      handler: 'NetworkFirst', // Tenta rede, se falhar, usa o cache do Supabase
    }
  ]
}

```