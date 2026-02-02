# PRD: Sistema de Flashcards Mobile - Ultra Focus

## 1. Visão Geral do Produto
O aplicativo é uma solução de alta performance para aprendizado acelerado, utilizando o método de repetição espaçada (Spaced Repetition System - SRS). Diferente de ferramentas genéricas, este produto foca na redução da carga cognitiva e na eficiência máxima do tempo de estudo, permitindo que estudantes e profissionais memorizem grandes volumes de dados complexos (fórmulas, idiomas, código, anatomia) através de uma interface tátil e visualmente otimizada.

## 2. Objetivos Estratégicos
*   **Eficiência de Memória:** Implementar um ciclo de retenção que minimize o esquecimento.
*   **Oclusão Visual:** Prover ferramentas avançadas para estudo anatômico e técnico via imagens.
*   **Foco Absoluto:** Eliminar distrações da interface para induzir o estado de "Flow".
*   **Sincronia Offline:** Garantir que o estudo ocorra em qualquer lugar, sem dependência de latência de rede.

## 3. Requisitos Funcionais (RF)

### 3.1. Gestão de Conteúdo e Estrutura
*   **RF01 - Hierarquia de Baralhos:** Permitir a criação de baralhos e sub-baralhos para organização granular de temas.
*   **RF02 - Editor de Cartões Multi-modal:**
    *   **Texto:** Suporte a Markdown básico.
    *   **Matemática:** Renderização de fórmulas via LaTeX.
    *   **Código:** Syntax highlighting para as principais linguagens de programação.
*   **RF03 - Editor de Oclusão de Imagem:** Ferramenta interna para carregar fotos e desenhar polígonos ou retângulos que ocultam partes da imagem. Cada máscara gera um "cartão virtual" independente.
*   **RF04 - Importação e Exportação:** Suporte para importação de arquivos CSV ou pacotes de baralhos compartilhados por outros usuários.

### 3.2. Mecânica de Revisão e Algoritmo
*   **RF05 - Algoritmo Adaptativo (SM-2 Modificado):** O sistema deve calcular o intervalo de revisão (1 dia, 3 dias, 7 dias, etc.) baseado na resposta do usuário.
*   **RF06 - Fila de Prioridade:** Cartões "Vencidos" ( overdue) devem ser apresentados antes de cartões "Novos" para evitar o colapso da memória de longo prazo.
*   **RF07 - Modo de Estudo Personalizado:** Opção de "Estudo Intensivo" para revisar cartões que ainda não venceram (útil para vésperas de exames).
*   **RF08 - Gestão de "Lapsos":** Cartões errados repetidamente devem ser marcados como "Sanguessugas" (Leeches) para que o usuário revise a qualidade do conteúdo.

### 3.3. Experiência e Sincronização
*   **RF09 - Sincronização Progressiva:** Sincronizar dados com a nuvem em background sempre que houver conexão, sem bloquear a interface.
*   **RF10 - Estatísticas Detalhadas:** Painel com gráficos de calor (heatmap) de estudo, retenção estimada e previsão de carga de trabalho para os próximos 30 dias.

## 4. Requisitos Não Funcionais (RNF)
*   **RNF01 - Latência Zero:** A transição entre o "Frente" e "Verso" do cartão deve ser inferior a 100ms.
*   **RNF02 - Segurança de Dados:** Criptografia local dos dados do usuário e backups automáticos.
*   **RNF03 - Design Ergonômico:** Todos os botões de classificação de dificuldade devem estar ao alcance do polegar na zona inferior da tela.
*   **RNF04 - Consumo de Bateria:** Otimização para baixo consumo de energia, especialmente no modo escuro (OLED friendly).

## 5. Regras de Negócio (Business Rules)
*   **RN01 - Limite de Novos Cartões:** Por padrão, o sistema sugere um limite de 20 cartões novos por dia para evitar o desânimo por sobrecarga (configurável).
*   **RN02 - Cálculo de Dificuldade:**
    *   *Esqueci:* Reinicia o intervalo para o mínimo (10 minutos).
    *   *Difícil:* Aumenta o intervalo levemente (multiplicador 1.2x).
    *   *Bom:* Aumenta o intervalo moderadamente (multiplicador 2.5x).
    *   *Fácil:* Salta o intervalo drasticamente (multiplicador 4x).

## 6. Identidade Visual e Guia de Estilo (UI/UX)

### 6.1. Conceito: "The Zen Workspace"
A interface deve transmitir calma. O uso de espaços em branco (ou espaços vazios no Dark Mode) é fundamental para não competir com a informação do cartão.

*   **Paleta de Cores:**
    *   **Surface:** #F8FAFC (Light) / #0F172A (Dark).
    *   **Primary Action:** #3B82F6 (Azul Foco).
    *   **Success:** #10B981 (Verde Mental).
    *   **Warning:** #F59E0B (Âmbar de Atenção).
*   **Tipografia:** Sistema de fontes dinâmico que aumenta o tamanho da fonte automaticamente para sentenças curtas, garantindo legibilidade máxima.

### 6.2. Micro-interações e Feedback Sensorial
*   **Haptic de Confirmação:** Ao finalizar a meta do dia, o celular deve emitir uma vibração rítmica (padrão "sucesso").
*   **Efeito de Profundidade:** Cartões em pilhas usam sombras dinâmicas que mudam de acordo com o acelerômetro do celular (efeito de giroscópio sutil).
*   **Oclusão de Imagem:** O efeito de "vidro jateado" nas máscaras deve ter uma leve animação de brilho para indicar que é um elemento interativo.

## 7. Fluxo do Usuário Detalhado
1.  **Dashboard:** O usuário abre o app e vê o "Score de Prontidão" (quantos cartões precisam de atenção imediata).
2.  **Sessão de Estudo:**
    *   O usuário clica em "Estudar Agora".
    *   Vê a pergunta -> Reflete -> Long Press para revelar.
    *   Avalia a dificuldade -> O cartão desliza para fora.
3.  **Finalização:** Ao terminar a pilha, o usuário recebe um resumo de quantos cartões foram "graduados" para o próximo nível de memorização.

## 8. Acessibilidade
*   **Suporte a Screen Readers:** Todas as imagens com oclusão devem permitir a adição de descrição alternativa para o verso.
*   **Contraste:** Garantir conformidade com WCAG 2.1 AA para todos os elementos de texto.
*   **Comandos de Voz:** Opção de ditar a resposta e usar comandos de voz como "Mostrar Resposta" e "Classificar como Bom".

## 9. Métricas de Sucesso (KPIs)
*   **Retenção Diária (DAU):** Porcentagem de usuários que retornam para completar suas revisões diárias.
*   **Taxa de Graduação:** Quantidade de cartões que passam do estado "Novo" para "Memorizado" em 30 dias.
*   **Tempo Médio de Resposta:** Monitorar se o design está facilitando ou dificultando a velocidade de pensamento.

## 10. Critérios de Aceite para MVP
*   O usuário pode criar, editar e excluir baralhos e cartões de texto/imagem.
*   O algoritmo de repetição espaçada deve agendar corretamente cartões para pelo menos 4 estados de tempo diferentes.
*   O modo offline deve permitir completar uma sessão inteira e sincronizar ao detectar rede.
*   A interface de oclusão de imagem deve suportar pelo menos 10 máscaras por foto sem perda de performance.

## 11. Stack Tecnológico
*   **Gerenciador de Pacotes:** Bun.
*   **Frontend:** Vue.js 3 + Vite.
*   **Backend:** Supabase.
