import { GoogleGenAI } from '@google/genai';

const getSystemPrompt = () => ``;

export class GoogleAIClient {
    private ai: GoogleGenAI;
    private model = 'gemini-2.5-flash';

    constructor(apiKey?: string) {
        const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY;
        if (!key) {
            throw new Error('VITE_GEMINI_API_KEY não configurada');
        }
        this.ai = new GoogleGenAI({ apiKey: key });
    }

    private buildPrompt(request: string): string {
        return request;
    }

    async analyze(request: string): Promise<string> {
        const prompt = this.buildPrompt(request);

        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: getSystemPrompt() }]
                    },
                    {
                        role: 'model',
                        parts: [{ text: 'Entendido. Fornecerei análises em JSON válido seguindo todas as diretrizes.' }]
                    },
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ],
                config: {
                    temperature: 0.3,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 8192
                }
            });

            const text = response.text?.trim() || '';
            if (!text) {
                throw new Error('Resposta vazia da AI');
            }

            let jsonText = text;
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);

            if (jsonMatch && jsonMatch[1]) {
                jsonText = jsonMatch[1].trim();
            } else if (codeMatch && codeMatch[1]) {
                jsonText = codeMatch[1].trim();
            }

            const analysis = JSON.parse(jsonText);

            if (!analysis.summary || !analysis.recommendations || !Array.isArray(analysis.recommendations)) {
                throw new Error('Resposta da AI em formato inválido');
            }

            return analysis;

        } catch (error) {
            console.error('Erro na análise AI:', error);
            throw new Error(
                error instanceof Error
                    ? `Falha na análise: ${error.message}`
                    : 'Erro desconhecido ao processar análise'
            );
        }
    }

}

export const createAnalyzer = (apiKey?: string) => new PortfolioAIAnalyzer(apiKey);
