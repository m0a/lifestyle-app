# Feature Specification: Multiple Photos Per Meal

**Feature Branch**: `016-multiple-meal-photos`
**Created**: 2026-01-06
**Status**: Draft
**Input**: User description: "一回の食事に複数の写真を取りたい - 食事を取り忘れていたり、あとから追加で食べたりするので複数の写真になることがあり得る。追加で写真を取って追加で分析したい"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Photos to Existing Meal (Priority: P1)

Users need to add additional photos to a meal they already recorded because they forgot to photograph some items or ate additional food after the initial recording.

**Why this priority**: Core functionality that directly addresses the primary use case described in the issue - users frequently forget items or add food later, making single-photo limitation a pain point.

**Independent Test**: Can be fully tested by creating a meal record with one photo, then adding one or more additional photos to the same meal record, and verifying all photos are displayed and contribute to the nutritional analysis.

**Acceptance Scenarios**:

1. **Given** a user has created a meal record with one photo, **When** they select "Add Photo" on that meal, **Then** they can take or select a new photo and it is added to the existing meal record
2. **Given** a meal record with multiple photos, **When** the user views the meal details, **Then** all photos are displayed in chronological order
3. **Given** a user adds a new photo to an existing meal, **When** AI analysis completes, **Then** the nutritional information is updated to include all photographed items from all photos

---

### User Story 2 - Add Photos via AI Chat (Priority: P2)

Users want to add photos during AI chat consultation when they mention eating additional items, allowing natural conversation flow without leaving the chat interface.

**Why this priority**: Critical for user experience - when users are discussing their meal with AI and remember they ate something else, they should be able to immediately add that photo in context rather than navigating away from the chat.

**Independent Test**: Can be fully tested by creating a meal with one photo, opening the AI chat for that meal, mentioning additional food eaten, adding a photo through the chat interface, and verifying the photo is added to the same meal record with updated nutritional analysis.

**Acceptance Scenarios**:

1. **Given** a user is chatting with AI about a meal, **When** they mention eating additional items, **Then** they see an option to "Add Photo" within the chat interface
2. **Given** a user adds a photo through the chat interface, **When** the photo is uploaded and analyzed, **Then** the meal's nutritional information is updated and the AI responds with the updated analysis
3. **Given** a user adds multiple photos during a chat session, **When** they return to the meal details, **Then** all photos added via chat are displayed alongside the original photos

---

### User Story 3 - View Multiple Photos in History List (Priority: P3)

Users want to see all photos for each meal in the history list without taking up excessive vertical space, allowing them to quickly browse through photos while scrolling through their meal history.

**Why this priority**: Essential for usability - if multiple photos are stacked vertically in the history list, it becomes difficult to scan through multiple meals. Horizontal scrolling within each meal item provides a compact, intuitive browsing experience. This is critical for the multi-photo feature to be practical in daily use.

**Independent Test**: Can be fully tested by creating multiple meals with 2-5 photos each, viewing the meal history list, and verifying that each meal's photos are displayed in a horizontally scrollable carousel that fits within the meal card.

**Acceptance Scenarios**:

1. **Given** a meal has multiple photos, **When** the user views the meal history list, **Then** the meal card displays photos in a horizontally scrollable carousel
2. **Given** a meal card shows a photo carousel, **When** the user swipes left/right on the photos, **Then** they can browse through all photos for that meal without leaving the list
3. **Given** a meal has 5 photos, **When** displayed in the history list, **Then** the carousel shows visual indicators (dots or thumbnails) of how many photos exist and which one is currently visible
4. **Given** multiple meals are displayed in the history list, **When** the user scrolls vertically, **Then** photo carousels do not interfere with vertical scrolling

---

### User Story 4 - Take Multiple Photos During Initial Recording (Priority: P4)

Users want to capture multiple photos of different parts of their meal during the initial recording session, such as photographing the main dish, side dishes, and dessert separately.

**Why this priority**: Enhances the initial recording experience and prevents users from needing to edit meals immediately after creation, but less critical than post-creation editing, chat-based addition, or history display.

**Independent Test**: Can be fully tested by creating a new meal record and adding 2-3 photos before saving, then verifying all photos are saved and analyzed together.

**Acceptance Scenarios**:

1. **Given** a user is creating a new meal record, **When** they take a photo, **Then** they see an option to "Add Another Photo" before saving
2. **Given** a user has taken multiple photos during initial recording, **When** they save the meal, **Then** all photos are saved and analyzed as a single meal
3. **Given** a user has added multiple photos during initial recording, **When** they review before saving, **Then** they can remove individual photos from the set

---

### User Story 5 - View and Manage Photo Gallery (Priority: P5)

Users want to view all photos associated with a meal in a full-screen gallery format and remove photos that were added by mistake or are no longer relevant.

**Why this priority**: Quality-of-life improvement that enhances user experience but doesn't block core functionality. Users can work with multiple photos without this feature.

**Independent Test**: Can be fully tested by creating a meal with 3+ photos, viewing them in full-screen gallery format, and successfully removing one or more photos.

**Acceptance Scenarios**:

1. **Given** a meal has multiple photos, **When** the user taps on any photo in the detail view or history list, **Then** a full-screen gallery view opens showing all photos with swipe navigation
2. **Given** a user is viewing a photo in full-screen gallery mode, **When** they select "Delete Photo", **Then** that photo is removed and nutritional analysis is recalculated
3. **Given** a meal has only one remaining photo, **When** the user attempts to delete it, **Then** they are warned that meals must have at least one photo

---

### Edge Cases

- What happens when a user tries to add more than 10 photos to a single meal? (System should enforce a reasonable limit to prevent abuse and storage issues)
- How does the system handle photo upload failures when adding additional photos? (Failed uploads should not affect existing photos; user can retry)
- What happens if AI analysis fails for one photo but succeeds for others? (System should display partial results and indicate which photo failed analysis)
- How does the system handle photos taken in rapid succession? (All photos should be queued and processed; UI should show progress for each)
- What happens when a user deletes a photo that was the basis for the meal's nutritional data? (System should recalculate based on remaining photos)
- What happens when a user adds a photo via chat while the AI is still processing a previous message? (Upload should be queued; AI should acknowledge receipt and process when ready)
- How does the chat interface handle slow photo uploads? (Show upload progress; allow users to continue chatting while upload proceeds in background)
- What happens if a user adds a photo in chat for a meal that has already reached the 10-photo limit? (System should inform user of the limit and suggest deleting an existing photo first)
- How does the carousel handle touch events to distinguish between horizontal swipe (photo navigation) and vertical swipe (list scrolling)? (Use gesture detection thresholds to determine intent; prioritize vertical scrolling when direction is ambiguous)
- What happens when a meal has only one photo in the history list? (Display single photo without carousel controls; no indicators needed)
- How does the carousel perform with slow-loading images in the history list? (Show loading placeholders; lazy-load images as user scrolls; prioritize first photo of each meal)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to add additional photos to an existing meal record after initial creation
- **FR-002**: System MUST support capturing multiple photos during initial meal creation before saving
- **FR-003**: System MUST display all photos associated with a meal in chronological order (based on upload time)
- **FR-004**: System MUST run AI nutritional analysis on all photos associated with a meal and aggregate the results
- **FR-005**: System MUST allow users to delete individual photos from a meal record (except the last remaining photo)
- **FR-006**: System MUST recalculate nutritional information when photos are added or removed from a meal
- **FR-007**: System MUST enforce a maximum limit of 10 photos per meal to prevent abuse and manage storage costs
- **FR-008**: System MUST preserve existing photos and nutritional data if adding a new photo fails
- **FR-009**: Users MUST be able to view all photos in a gallery/carousel interface
- **FR-010**: System MUST maintain the association between individual AI analysis results and their corresponding photos for transparency
- **FR-011**: System MUST allow users to add photos to a meal through the AI chat interface
- **FR-012**: System MUST update the AI chat conversation with the new nutritional analysis when a photo is added via chat
- **FR-013**: System MUST allow photo uploads to proceed in the background while users continue the chat conversation
- **FR-014**: System MUST display multiple photos in a horizontally scrollable carousel format in the meal history list
- **FR-015**: System MUST show visual indicators (dots or thumbnails) for carousel navigation showing current position and total photo count
- **FR-016**: System MUST ensure horizontal photo scrolling does not interfere with vertical list scrolling

### Key Entities

- **Meal Record**: Represents a single eating occasion, now associated with one or more photos instead of a single photo. Key attributes include meal time, total calories (aggregated from all photos), total nutrients (aggregated), and creation timestamp.

- **Photo**: Represents an individual photograph of food items, associated with a specific meal record. Key attributes include upload timestamp, storage reference (R2 URL), AI analysis status, and individual nutritional analysis results.

- **AI Analysis Result**: Nutritional breakdown derived from a single photo, linked to both the photo and the parent meal. Includes identified food items, portions, calories, and macronutrients for that specific photo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add up to 10 additional photos to an existing meal within 30 seconds per photo (including photo capture and upload)
- **SC-002**: 90% of multi-photo meals have their aggregated nutritional analysis completed within 2 minutes of the last photo upload
- **SC-003**: Users can successfully add photos to existing meals without losing previously recorded nutritional data in 100% of cases (unless explicitly deleting photos)
- **SC-004**: The photo gallery interface allows users to navigate between photos in under 1 second per swipe
- **SC-005**: 80% of users who add multiple photos to a meal report that the feature better captures their actual food intake compared to single-photo limitation
- **SC-006**: Users can add a photo via chat interface without leaving the conversation in 100% of cases
- **SC-007**: AI chat responds with updated nutritional analysis within 30 seconds after a photo is added via chat
- **SC-008**: Users can swipe through all photos in a meal card's carousel without accidentally triggering vertical scroll in 95% of interactions
- **SC-009**: Carousel indicators update within 100ms of photo transition to show current position
- **SC-010**: First photo of each meal in the history list loads within 1 second on standard network connections
