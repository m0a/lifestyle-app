# Feature Specification: Multi-Exercise Import Selection

**Feature Branch**: `017-multi-exercise-import`
**Created**: 2026-01-08
**Status**: Draft
**Input**: User description: "Allow users to select which past training to import when multiple exercises are available from the same date"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select from Multiple Past Exercises (Priority: P1)

When a user wants to reuse a past workout and there are multiple exercises recorded on the same date, they need to choose which specific exercise to import rather than being limited to only one option.

**Why this priority**: This is the core functionality that solves the reported issue. Currently, users can only import one exercise (e.g., "dips" in the screenshot), making the import feature unusable when multiple exercises were performed on the same day.

**Independent Test**: Can be fully tested by creating multiple exercise records on a past date, then attempting to import exercises from that date, and verifying that all exercises are displayed for selection.

**Acceptance Scenarios**:

1. **Given** I have multiple exercise records from January 5th (dips, push-ups, squats), **When** I navigate to the exercise import screen and select January 5th, **Then** I see a list of all three exercises with their names and details
2. **Given** I see the list of available exercises from a past date, **When** I select "push-ups" from the list, **Then** the push-ups exercise details are imported into the current workout form
3. **Given** I see the list of available exercises from a past date, **When** I select an exercise, **Then** the import dialog closes and I can continue editing or saving the workout

---

### User Story 2 - Visual Clarity in Exercise Selection (Priority: P2)

Users need to easily distinguish between different exercises from the same date by seeing key details (exercise name, sets, reps, weight) to make an informed selection.

**Why this priority**: This enhances usability by helping users quickly identify the correct exercise to import, especially when multiple similar exercises exist (e.g., "barbell bench press" vs "dumbbell bench press").

**Independent Test**: Can be tested by creating exercises with similar names but different details, then verifying the selection list displays distinguishing information clearly.

**Acceptance Scenarios**:

1. **Given** I have exercises from the same date with different details, **When** I view the exercise selection list, **Then** each exercise shows its name, number of sets, primary weight/rep information, and timestamp
2. **Given** I have many exercises from the same date, **When** I view the selection list, **Then** the list is scrollable and each exercise is clearly separated visually

---

### User Story 3 - Quick Import from Recent Workouts (Priority: P3)

Users who frequently repeat the same exercises want to quickly import from recent workouts without navigating through a calendar.

**Why this priority**: This is a convenience enhancement that improves workflow for users with regular training routines. It's not essential for fixing the core issue but adds significant value for frequent users.

**Independent Test**: Can be tested by recording exercises over multiple dates, then verifying a "recent exercises" shortcut displays the most recent unique exercises for quick import.

**Acceptance Scenarios**:

1. **Given** I have performed various exercises over the past week, **When** I open the import feature, **Then** I see a "Recent Workouts" section showing the most recent 10 unique exercises
2. **Given** I see the recent workouts list, **When** I tap on a recent exercise, **Then** it immediately imports without requiring date selection
3. **Given** multiple exercises were performed on the same recent date, **When** I tap on that date in recent workouts, **Then** I see the selection dialog with all exercises from that date

---

### Edge Cases

- What happens when a past date has 20+ exercises recorded? (List should be scrollable and render within performance targets: <200ms for ≤50 items, <1s for ≤100 items)
- How does the system handle exercises with identical names but different parameters on the same date? (Show all details including name, sets, weight, and timestamp to distinguish them)
- What happens if a user cancels the selection dialog? (Return to previous screen without importing)
- How does the system handle exercises with missing or incomplete data? (Display available information, allow import with warnings if needed)
- What happens when importing an exercise while a workout is already in progress? (System displays a dialog asking user to choose "Add to current workout" or "Replace current workout")
- What happens when a selected date has no exercise records? (Display message "この日はエクササイズが記録されていません" with option to select a different date)
- What should be displayed while the exercise list is loading? (Show skeleton screen with list item placeholders in gray to reduce perceived wait time and prevent layout shift)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all exercise records from a selected past date when multiple exercises exist
- **FR-002**: System MUST allow users to select one exercise from the list of available exercises
- **FR-003**: System MUST import the selected exercise's complete data (name, sets, reps, weight, notes) into the current workout form
- **FR-004**: Users MUST be able to cancel the selection process and return to the previous screen
- **FR-005**: System MUST display sufficient details for each exercise in the selection list (exercise name, number of sets, primary rep/weight information, and timestamp) to enable unique identification
- **FR-006**: System MUST automatically import the exercise when only one exercise exists on the selected date (skipping the selection dialog for efficiency)
- **FR-007**: System MUST provide a scrollable interface when more than 5-10 exercises exist on a single date
- **FR-008**: System MUST show the date and day of week for the exercises being imported for context
- **FR-009**: System MUST preserve the original exercise data from the past date (read-only import, not modifying historical records)
- **FR-010**: System MUST prompt users with a choice dialog when importing an exercise while a workout is already in progress, offering options to "Add to current workout" or "Replace current workout"
- **FR-011**: System MUST display the 10 most recent unique exercises in the "Recent Workouts" section for quick access
- **FR-012**: System MUST display an informative message "この日はエクササイズが記録されていません" when a selected date has no exercise records, with option to select a different date
- **FR-013**: System MUST display a skeleton screen with list item placeholders while the exercise list is loading to reduce perceived wait time and prevent layout shift

### Key Entities *(include if feature involves data)*

- **Exercise Record**: Past workout exercise with attributes including exercise name, date performed, sets, repetitions, weight, duration, notes
- **Exercise Selection**: User's choice of which exercise to import from a list of options
- **Current Workout**: The active workout session where imported exercise data will be added

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully import any exercise from a date with multiple exercises within 3 taps
- **SC-002**: Exercise selection list displays all available exercises from a past date with 100% accuracy
- **SC-003**: 95% of users successfully select and import their intended exercise on first attempt
- **SC-004**: Exercise import completion rate increases from current baseline (where users abandon import when their desired exercise isn't available)

### Non-Functional Quality Attributes

- **Performance**: Exercise selection list MUST render within 200ms for up to 50 exercises, and within 1 second for up to 100 exercises

## Clarifications

### Session 2026-01-08

- Q: What are the specific performance targets for displaying exercise lists of varying sizes? → A: 50 exercises or fewer must display instantly (<200ms), up to 100 exercises within 1 second
- Q: How many recent exercises should be displayed in the "Recent Workouts" section? → A: Display the 10 most recent unique exercises
- Q: How should the system distinguish between exercises with identical names and parameters on the same date? → A: Display name, sets, weight, and timestamp for unique identification
- Q: What should be displayed when a selected date has no exercise records? → A: Display informative message "この日はエクササイズが記録されていません" with option to select a different date
- Q: What should be displayed while the exercise list is loading? → A: Show skeleton screen with list item placeholders in gray
