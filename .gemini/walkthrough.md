# Flashcard App - Walkthrough

I have implemented the Flashcard App with the following features based on the PRD:

## Implemented Features

### 1. Core Architecture
- **Domain-Driven Design**: Models defined in `src/domain/models.ts`.
- **Offline Storage**: `LocalStorageService` for authentic offline-first capabilities.
- **Service Layer**: Decoupled storage logic from UI.

### 2. Spaced Repetition (SM-2)
- Implemented the SuperMemo 2 algorithm in `src/utils/sm2.ts`.
- The `useSpacedRepetition` composable handles the grading logic (Again, Hard, Good, Easy) and scheduling.
- **Unit Tested**: The scheduling logic is covered by unit tests in `src/composables/__tests__/useSpacedRepetition.spec.ts`.

### 3. Neumorphic UI
- Created a custom Neumorphic Design System using CSS variables interactively (`src/assets/base.css`).
- **Components**:
    - `NeumorphicCard`: Soft shadows, interactive states.
    - `NeumorphicButton`: Pressed states, variants (Primary, Danger, etc.).
    - **Integration**: Updated `App.vue` to route correctly to new views.

### 4. Flashcard Management
- **Dashboard**: View decks and card counts.
- **Editor**: Create Decks and Cards. Supports both **Text** and **Image Occlusion** modes.
- **Image Occlusion**:
    - Upload an image.
    - Draw rectangles to hide information.
    - Save metadata within the card.

### 5. Study Mode
- **Review Session**: Filters cards due for review (`isDue` logic).
- **Interation**:
    - **Text Cards**: Tap to flip, rate difficulty.
    - **Image Occlusion**: Tap obscured areas to reveal them individually, or reveal all.
- **Progress**: Tracks session completion.

## Verification

### Automated Tests
I attempted to run the unit tests, but encountered an environment issue (`ERR_REQUIRE_ESM`) related to `jsdom` within the current terminal session (Node v18 detected, while project suggests newer).
However, the tests are written and available at:
- `src/composables/__tests__/useSpacedRepetition.spec.ts`

To run them in your local environment:
```bash
npm run test:unit
```

### Manual Verification Steps
1. **Open the App**: Run `npm run dev` and open the URL.
2. **Create a Deck**: Click "+ New Deck".
3. **Add a Card**:
    - Select "Text" mode: Enter Front/Back.
    - Select "Image Occlusion": Upload an image, drag to draw masks.
4. **Study**:
    - Click "Study Now" on the deck.
    - Verify cards appear.
    - Test "Flip" and "Rating" buttons.
    - Verify Image Occlusion masks are clickable.

## Next Steps
- Implement `Media Queries` for better mobile responsiveness if needed (currently responsive grid).
- effective migration to `IndexedDB` for larger image storage (LocalStorage has 5MB limit).
