# Flashcard App Implementation Plan

## Goal Description
Implement a mobile-first Flashcard App using Vue 3 and composables, adhering to the PRD requirements (Spaced Repetition, Neumorphic Design, Image Occlusion). The architecture will be scalable, using the Composition API and adhering to Single Responsibility Principles as per "Martin Fowler" style clean code.

## User Review Required
> [!IMPORTANT]
> The app will be built as a client-side only application initially ("Offline First"), using `localStorage` (via a Service pattern) for persistence. This allows for future migration to IndexedDB or a Backend API without changing the domain logic.

## Proposed Changes

### Architecture
We will adopt a layered architecture within Vue:
- **Domain Layer (`src/domain/`)**: Pure TypeScript interfaces and types defining the core business logic (Deck, Flashcard, Review).
- **Service Layer (`src/services/`)**: Abstractions for data storage (StorageService).
- **Application Layer (`src/composables/`)**: Reusable logic combining state and services (useDeck, useSpacedRepetition, useTheme).
- **Presentation Layer (`src/components/`, `src/views/`)**: Dumb UI components (Neumorphic) and smart Views.

### Frontend
#### [MODIFY] [package.json](file://wsl.localhost/Ubuntu/home/miguelsb/workspace/flashcard-app/frontend/package.json)
- Ensure all dependencies are up to date. (Already verified).

#### [NEW] `src/domain/models.ts`
- Define `Deck`, `Flashcard`, `ReviewLog` interfaces.
- Define `SpacedRepetitionConfig` type.

#### [NEW] `src/services/storage.ts`
- `IStorageService` interface.
- `LocalStorageService` implementation (adapters).

#### [NEW] `src/utils/sm2.ts` (or similar)
- Implementation of the Spaced Repetition Algorithm (SuperMemo 2 or simplified).

#### [NEW] `src/composables/`
- `useDecks.ts`: Manage deck list, creation, deletion.
- `useCards.ts`: Manage cards within a deck.
- `useSpacedRepetition.ts`: Handle review scheduling logic.
- `useNeumorphism.ts`: Helper for style generation if needed (or just CSS).

#### [NEW] `src/components/ui/`
- `NeumorphicCard.vue`: Base container with soft shadows.
- `NeumorphicButton.vue`: Soft UI button with press states.

#### [NEW] `src/views/`
- `DashboardView.vue`: List decks, daily summary.
- `StudyView.vue`: The main study interface (Flashcard front/back, rating buttons).
- `EditorView.vue`: For creating/editing decks and cards.

## Verification Plan

### Automated Tests
**Run**: `npm run test:unit`
- [NEW] `src/composables/__tests__/useSpacedRepetition.spec.ts`: Verify the scheduling algorithm updates `nextReviewDate` correctly based on rating.
- [NEW] `src/services/__tests__/LocalStorageService.spec.ts`: Mock localStorage and verify CRUD.

### Manual Verification
1. **Neumorphic Feel**: Open app in mobile emulation (Chrome DevTools). Verify shadows look "soft" and buttons press in.
2. **Offline Data**: Add a deck and a card. Reload the page. Ensure data persists.
3. **Study Flow**: 
   - Create a card.
   - Start study.
   - Rate "Hard".
   - Verify it appears again tomorrow (or according to algorithm logic).
