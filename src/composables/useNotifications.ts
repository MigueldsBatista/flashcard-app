import { readonly, ref } from 'vue'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

export interface Notification {
    id: string
    type: NotificationType
    message: string
    duration: number
}

const notifications = ref<Notification[]>([])

function generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function show(message: string, type: NotificationType = 'info', duration = 3000) {
    const id = generateId()
    const notification: Notification = {
        id,
        type,
        message,
        duration,
    }

    notifications.value.push(notification)

    if (duration > 0) {
        setTimeout(() => {
            dismiss(id)
        }, duration)
    }

    return id
}

function dismiss(id: string) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
        notifications.value.splice(index, 1)
    }
}

function dismissAll() {
    notifications.value = []
}

// Convenience methods
const success = (message: string, duration?: number) => show(message, 'success', duration)
const error = (message: string, duration?: number) => show(message, 'error', duration)
const info = (message: string, duration?: number) => show(message, 'info', duration)
const warning = (message: string, duration?: number) => show(message, 'warning', duration)

export function useNotifications() {
    return {
        notifications: readonly(notifications),
        show,
        dismiss,
        dismissAll,
        success,
        error,
        info,
        warning,
    }
}
