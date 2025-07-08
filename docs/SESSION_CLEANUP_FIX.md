# Session Cleanup Bug Fix

## Problem

Multiple ongoing practice sessions were appearing in the "Continue Your Practice" section due to inconsistent session cleanup across different practice pages.

## Root Cause

The exit functionality was not properly cleaning up sessions in all practice types:

- **Random practice page**: ✅ Properly DELETED sessions when exiting
- **Topic practice pages**: ❌ Only cleared localStorage, left sessions as "IN_PROGRESS"
- **Question group practice pages**: ❌ Only cleared localStorage, left sessions as "IN_PROGRESS"
- **Chinese cloze practice pages**: ❌ Only cleared localStorage, left sessions as "IN_PROGRESS"

This inconsistency meant that sessions from topic/question group practices remained "IN_PROGRESS" forever, causing multiple sessions to appear in the "Continue Your Practice" section.

## Solution

### 1. Created Unified Session Management (`src/lib/session-management.ts`)

Added a new `cleanupPracticeSession()` function that:

- Cleans up localStorage
- Deletes the session from the database (fire and forget)
- Provides consistent behavior across all practice types

```typescript
export async function cleanupPracticeSession(
  options: SessionCleanupOptions
): Promise<boolean> {
  const { sessionId, localStorageKey } = options;

  // Clean up localStorage
  if (localStorageKey) {
    localStorage.removeItem(localStorageKey);
  }

  // Delete session from database
  if (sessionId) {
    await fetch(`/api/practice-sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  return true;
}
```

### 2. Updated All Practice Pages

Modified the `handleExitConfirm` function in all practice pages to use the unified cleanup:

- `src/app/(dashboard)/student/practice/topic/[topicId]/page.tsx`
- `src/app/(dashboard)/student/practice/question-group/[questionGroupId]/page.tsx`
- `src/app/(dashboard)/student/practice/chinese/cloze/[questionGroupId]/page.tsx`

### 3. Created Cleanup Script (`scripts/cleanup-orphaned-sessions.js`)

Added a maintenance script to remove any existing orphaned sessions that may have been left from the previous bug.

## Files Modified

1. **`src/lib/session-management.ts`** - Added unified cleanup function
2. **`src/app/(dashboard)/student/practice/topic/[topicId]/page.tsx`** - Updated exit handling
3. **`src/app/(dashboard)/student/practice/question-group/[questionGroupId]/page.tsx`** - Updated exit handling
4. **`src/app/(dashboard)/student/practice/chinese/cloze/[questionGroupId]/page.tsx`** - Updated exit handling
5. **`scripts/cleanup-orphaned-sessions.js`** - New cleanup script

## Testing

The fix ensures that:

- ✅ Only one session can be "IN_PROGRESS" per user at a time
- ✅ Exit button properly cleans up sessions across all practice types
- ✅ "Continue Your Practice" section shows accurate data
- ✅ No orphaned sessions accumulate over time

## Usage

To clean up any existing orphaned sessions:

```bash
node scripts/cleanup-orphaned-sessions.js
```

## Prevention

The unified session cleanup approach prevents this issue from recurring by ensuring all practice pages follow the same cleanup pattern when users exit sessions.
