import { ref, watch, type Ref } from 'vue'

export function useLocalStorage<T>(key: string, initialValue: T): Ref<T> {
    // Try to get initial value from localStorage
    const getStoredValue = (): T => {
        try {
            const item = window.localStorage.getItem(key)
            return item ? JSON.parse(item) : initialValue
        } catch (error) {
            console.error(`Error loading ${key} from localStorage:`, error)
            return initialValue
        }
    }

    const storedValue = ref<T>(getStoredValue()) as Ref<T>

    // Watch for changes and persist to localStorage
    watch(
        storedValue,
        (newValue) => {
            try {
                window.localStorage.setItem(key, JSON.stringify(newValue))
            } catch (error) {
                console.error(`Error saving ${key} to localStorage:`, error)
            }
        },
        { deep: true }
    )

    return storedValue
}
