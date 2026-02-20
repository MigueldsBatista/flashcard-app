Para implementar essas funcionalidades no **Ultra Focus** utilizando o `vite-plugin-pwa`, siga este guia técnico estruturado. Ele foca na experiência **Mobile First** e na redução de carga cognitiva definida no seu **PRD**.

---

## 1. Install & Create Standalone App

Para que o app se comporte como um aplicativo nativo (sem barras de navegador), configuramos o `display: standalone` no manifesto.

* **Configuração:** No `vite.config.ts`, dentro do objeto `manifest`:
* `display: "standalone"`: Remove a interface do navegador.
* `orientation: "portrait"`: Trava a orientação para garantir que os botões fiquem na zona do polegar.


* **Prompt de Instalação:** Use o evento `beforeinstallprompt` no Vue para disparar um botão customizado com o seu **Azul Foco (#3B82F6)**.

## 2. Expose Common App Actions (Shortcuts)

Os atalhos permitem que o usuário vá direto para funções específicas ao pressionar o ícone do app no Android/iOS.

* **Implementação:** Adicione a chave `shortcuts` no seu `manifest`:
```json
"shortcuts": [
  {
    "name": "Estudar Agora",
    "short_name": "Estudar",
    "url": "/estudar",
    "icons": [{ "src": "/icons/play.png", "sizes": "192x192" }]
  },
  {
    "name": "Novo Cartão",
    "url": "/criar",
    "icons": [{ "src": "/icons/add.png", "sizes": "192x192" }]
  }
]

```



## 3. App Icon & Identity

Para uma aparência profissional e "OLED friendly":

* **Ícones:** Você deve gerar ícones de `192x192` e `512x512` pixels.
* **Maskable Icons:** Certifique-se de que o ícone principal tenha a propriedade `"purpose": "maskable"`. Isso permite que o Android adapte o ícone a diferentes formatos (círculo, quadrado, etc.) sem cortar sua logo.
* **Splash Screen:** O `background_color` no manifesto deve ser seu **#0F172A** (Dark Mode) para evitar flashes brancos.





## 5. Push Notifications

Essencial para lembrar o usuário de revisar os cartões "Vencidos".

* **Permissão:** Use `Notification.requestPermission()`.
* **Backend:** Usando o **Firebase Cloud Messaging (FCM)**.
* **Fluxo:** O Service Worker (PWA) recebe o evento em background e exibe a notificação, mesmo com o app fechado.



---

### Próximo Passo

Para garantir que as **Push Notifications** funcionem de forma assertiva sem gastar bateria, você gostaria que eu mostrasse como configurar o **Service Worker** customizado para lidar com cliques nas notificações e levar o usuário direto para o baralho específico?

https://console.firebase.google.com/u/0/project/flashcard-app-54a88/settings/cloudmessaging?hl=pt-br
https://firebase.google.com/docs/cloud-messaging/web/get-started?hl=pt-br#web
https://supabase.com/docs/guides/functions/examples/push-notifications?queryGroups=platform&platform=fcm