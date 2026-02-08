/**
 * Composable for canvas zoom and pan functionality.
 * Uses @vueuse/gesture for pinch, wheel, and drag gestures.
 */

import { useDrag, usePinch, useWheel } from '@vueuse/gesture'
import { computed, type Ref, ref } from 'vue'

export interface ZoomPanOptions {
    minZoom?: number
    maxZoom?: number
    zoomSensitivity?: number
}

export interface ZoomPanState {
    zoom: Ref<number>
    offset: Ref<{ x: number; y: number }>
    isPanning: Ref<boolean>
    isPinching: Ref<boolean>
}

const DEFAULT_OPTIONS: Required<ZoomPanOptions> = {
    minZoom: 0.5,
    maxZoom: 4,
    zoomSensitivity: 0.002,
}

export function useCanvasZoomPan(
    target: Ref<HTMLElement | null>,
    options: ZoomPanOptions = {}
) {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    const zoom = ref(1)
    const offset = ref({ x: 0, y: 0 })
    const isPanning = ref(false)
    const isPinching = ref(false)

    // Wheel zoom (desktop)
    useWheel(
        ({ delta: [, deltaY], event }) => {
            event?.preventDefault()
            const newZoom = zoom.value - deltaY * opts.zoomSensitivity
            zoom.value = Math.max(opts.minZoom, Math.min(opts.maxZoom, newZoom))
        },
        { domTarget: target }
    )

    // Pinch zoom (touch)
    usePinch(
        ({ offset: [scale], pinching }) => {
            isPinching.value = pinching ?? false
            if (pinching) {
                zoom.value = Math.max(opts.minZoom, Math.min(opts.maxZoom, scale))
            }
        },
        {
            domTarget: target,
            scaleBounds: { min: opts.minZoom, max: opts.maxZoom },
        }
    )

    // Drag to pan (when zoomed)
    useDrag(
        ({ movement: [mx, my], dragging, event }) => {
            // Only pan when zoomed in
            if (zoom.value <= 1) return

            isPanning.value = dragging ?? false

            if (dragging) {
                offset.value = { x: mx, y: my }
            } else {
                // Reset offset on drag end (or keep it for persistent pan)
                // For now keep the position
            }
        },
        {
            domTarget: target,
            filterTaps: true,
        }
    )

    function resetView() {
        zoom.value = 1
        offset.value = { x: 0, y: 0 }
    }

    function zoomIn() {
        zoom.value = Math.min(opts.maxZoom, zoom.value + 0.25)
    }

    function zoomOut() {
        zoom.value = Math.max(opts.minZoom, zoom.value - 0.25)
    }

    const canZoomIn = computed(() => zoom.value < opts.maxZoom)
    const canZoomOut = computed(() => zoom.value > opts.minZoom)
    const isZoomed = computed(() => zoom.value !== 1)

    // CSS transform string for easy application
    const transform = computed(() => {
        return `scale(${zoom.value}) translate(${offset.value.x}px, ${offset.value.y}px)`
    })

    return {
        // State
        zoom,
        offset,
        isPanning,
        isPinching,
        isZoomed,

        // Computed
        transform,
        canZoomIn,
        canZoomOut,

        // Actions
        resetView,
        zoomIn,
        zoomOut,
    }
}
