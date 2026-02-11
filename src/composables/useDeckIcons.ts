/**
 * Composable providing deck icon selection and AI-based suggestion.
 * Uses Lucide icon names mapped to study-related categories.
 */

import {
    Activity,
    Atom,
    BookOpen,
    Brain,
    Briefcase,
    Calculator,
    Code,
    Compass,
    Dna,
    Earth,
    FileText,
    FlaskConical,
    Gamepad2,
    GraduationCap,
    Heart,
    History,
    Landmark,
    Languages,
    Laptop,
    Leaf,
    Library,
    Lightbulb,
    Music,
    Palette,
    Pill,
    Scale,
    Stethoscope,
    type LucideIcon,
} from 'lucide-vue-next'

export interface DeckIconOption {
    name: string       // Lucide component name (used as key / stored in DB)
    label: string      // Display label in Portuguese
    component: LucideIcon
    keywords: string[] // Used by AI suggestion
}

export const DECK_ICONS: DeckIconOption[] = [
    { name: 'BookOpen', label: 'Livro', component: BookOpen, keywords: ['livro', 'leitura', 'literatura', 'português', 'redação', 'texto'] },
    { name: 'Brain', label: 'Cérebro', component: Brain, keywords: ['psicologia', 'neurociência', 'mente', 'cognição', 'memória'] },
    { name: 'GraduationCap', label: 'Formatura', component: GraduationCap, keywords: ['vestibular', 'enem', 'concurso', 'prova', 'exame', 'educação'] },
    { name: 'Stethoscope', label: 'Estetoscópio', component: Stethoscope, keywords: ['medicina', 'saúde', 'médico', 'clínica', 'diagnóstico'] },
    { name: 'Dna', label: 'DNA', component: Dna, keywords: ['biologia', 'genética', 'célula', 'evolução', 'vida'] },
    { name: 'Atom', label: 'Átomo', component: Atom, keywords: ['física', 'química', 'átomo', 'partícula', 'energia'] },
    { name: 'FlaskConical', label: 'Frasco', component: FlaskConical, keywords: ['química', 'laboratório', 'reação', 'experimento', 'ciência'] },
    { name: 'Calculator', label: 'Calculadora', component: Calculator, keywords: ['matemática', 'cálculo', 'álgebra', 'estatística', 'número'] },
    { name: 'Code', label: 'Código', component: Code, keywords: ['programação', 'código', 'software', 'algoritmo', 'desenvolvimento'] },
    { name: 'Laptop', label: 'Laptop', component: Laptop, keywords: ['computação', 'informática', 'tecnologia', 'computador', 'ti'] },
    { name: 'Languages', label: 'Idiomas', component: Languages, keywords: ['inglês', 'espanhol', 'francês', 'idioma', 'língua', 'vocabulário'] },
    { name: 'Landmark', label: 'Marco', component: Landmark, keywords: ['história', 'geografia', 'governo', 'política', 'monumento'] },
    { name: 'Scale', label: 'Balança', component: Scale, keywords: ['direito', 'lei', 'justiça', 'jurídico', 'constitucional'] },
    { name: 'Heart', label: 'Coração', component: Heart, keywords: ['anatomia', 'cardiologia', 'corpo', 'órgão', 'fisiologia'] },
    { name: 'Pill', label: 'Pílula', component: Pill, keywords: ['farmácia', 'medicamento', 'farmacologia', 'remédio', 'droga'] },
    { name: 'Activity', label: 'Atividade', component: Activity, keywords: ['educação física', 'esporte', 'exercício', 'fitness', 'saúde'] },
    { name: 'Leaf', label: 'Folha', component: Leaf, keywords: ['botânica', 'ecologia', 'ambiente', 'natureza', 'sustentabilidade'] },
    { name: 'Earth', label: 'Terra', component: Earth, keywords: ['geografia', 'mundo', 'planeta', 'clima', 'mapa'] },
    { name: 'Music', label: 'Música', component: Music, keywords: ['música', 'instrumento', 'harmonia', 'ritmo', 'melodia'] },
    { name: 'Palette', label: 'Paleta', component: Palette, keywords: ['arte', 'pintura', 'desenho', 'criativo', 'design'] },
    { name: 'Briefcase', label: 'Pasta', component: Briefcase, keywords: ['negócios', 'administração', 'economia', 'gestão', 'empresa'] },
    { name: 'Compass', label: 'Bússola', component: Compass, keywords: ['filosofia', 'ética', 'sociologia', 'orientação', 'exploração'] },
    { name: 'History', label: 'Relógio', component: History, keywords: ['história', 'passado', 'evento', 'cronologia', 'época'] },
    { name: 'Lightbulb', label: 'Lâmpada', component: Lightbulb, keywords: ['ideia', 'criatividade', 'inovação', 'insight', 'geral'] },
    { name: 'FileText', label: 'Documento', component: FileText, keywords: ['documento', 'anotação', 'resumo', 'nota', 'fichamento'] },
    { name: 'Library', label: 'Biblioteca', component: Library, keywords: ['biblioteca', 'estudo', 'pesquisa', 'referência', 'acadêmico'] },
    { name: 'Gamepad2', label: 'Joystick', component: Gamepad2, keywords: ['jogo', 'game', 'entretenimento', 'diversão', 'quiz'] },
]

/**
 * Suggest an icon based on deck name and description using keyword matching.
 * Returns the icon name that best matches the input text.
 */
export function suggestDeckIcon(name: string, description?: string): string {
    const text = `${name} ${description || ''}`.toLowerCase()

    let bestMatch = ''
    let bestScore = 0

    for (const icon of DECK_ICONS) {
        let score = 0
        for (const kw of icon.keywords) {
            if (text.includes(kw)) {
                // Longer keyword matches are stronger signals
                score += kw.length
            }
        }
        if (score > bestScore) {
            bestScore = score
            bestMatch = icon.name
        }
    }

    // Default to BookOpen if no keywords matched
    return bestMatch || 'BookOpen'
}

/**
 * Get the Lucide component for a given icon name.
 * Falls back to BookOpen if the name is not found.
 */
export function getDeckIconComponent(iconName?: string): LucideIcon {
    if (!iconName) return BookOpen
    const found = DECK_ICONS.find(i => i.name === iconName)
    return found?.component ?? BookOpen
}

export function useDeckIcons() {
    return {
        icons: DECK_ICONS,
        suggestIcon: suggestDeckIcon,
        getIconComponent: getDeckIconComponent,
    }
}
