---
trigger: always_on
---

1. Never use events with multiple actions inline, for example update:model-value="(v) => { if (!v) { isCreating = false; editingDeck = null; resetForm() }"
Since this makes the code harder to read and track

2. Components should not be bigger than 200 lines, this is probably a sign that it could be broken into smaller components with more specific logic

3. Dumb components smart composables, components should not have a internal logic, this should almost always be inside composables, helpers etc, and composables should only orchestrate

