<script setup lang="ts">
import { useNotifications, type NotificationType } from '@/composables/useNotifications'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-vue-next'

const { notifications, dismiss } = useNotifications()

function getIcon(type: NotificationType) {
  switch (type) {
    case 'success': return CheckCircle2
    case 'error': return XCircle
    case 'warning': return AlertTriangle
    default: return Info
  }
}

function getStyles(type: NotificationType) {
  switch (type) {
    case 'success':
      return 'bg-success text-white'
    case 'error':
      return 'bg-destructive text-white'
    case 'warning':
      return 'bg-warning text-white'
    default:
      return 'bg-card text-foreground border border-border'
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto',
            getStyles(notification.type)
          ]"
        >
          <component
            :is="getIcon(notification.type)"
            class="w-5 h-5 flex-shrink-0"
          />
          <p class="flex-1 text-sm font-medium">
            {{ notification.message }}
          </p>
          <button
            class="p-1 rounded-lg hover:bg-black/10 transition-colors"
            @click="dismiss(notification.id)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
