import type { CardContent } from '@/types/flashcard'
import type { GeneratedCard, GenerateOptions, IAIGeneratorService } from '../types'

interface AIGenerateResponse {
    cards: Array<{ content: CardContent }>
}

export class ApiAIGeneratorService implements IAIGeneratorService {
    private readonly endpoint: string

    constructor(endpoint = '/api/generate') {
        this.endpoint = endpoint
    }

    async generateFromImage(image: File, options?: GenerateOptions): Promise<GeneratedCard[]> {
        const formData = new FormData()
        formData.append('image', image)

        if (options?.context) {
            formData.append('context', options.context)
        }
        if (options?.numCards && options.numCards > 0) {
            formData.append('num_cards', options.numCards.toString())
        }

        return this.send(formData)
    }

    async generateFromText(text: string, options?: GenerateOptions): Promise<GeneratedCard[]> {
        const formData = new FormData()
        formData.append('text', text)

        if (options?.context) {
            formData.append('context', options.context)
        }
        if (options?.numCards && options.numCards > 0) {
            formData.append('num_cards', options.numCards.toString())
        }

        return this.send(formData)
    }

    private async send(formData: FormData): Promise<GeneratedCard[]> {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail?.error || errorData.detail || 'Erro na geração')
        }

        const data: AIGenerateResponse = await response.json()

        if (!data.cards || data.cards.length === 0) {
            throw new Error('Nenhum flashcard gerado. Tente com conteúdo mais detalhado.')
        }

        return data.cards.map((card: GeneratedCard) => ({
            content: card.content,
        }))
    }
}
