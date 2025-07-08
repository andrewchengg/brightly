# 🔒 Paywall Implementation Guide

## Overview

This guide explains how to implement the subscription-based paywall system that blocks access to Math ($20/month) and Chinese ($40/month) features after a 3-day free trial.

## 📋 Current Status

- ✅ **Database Schema**: Subject pricing models added
- ✅ **Pricing Data**: Math ($20/month), Chinese ($40/month) seeded
- ✅ **Utility Functions**: Subscription access checking created
- ✅ **UI Components**: Paywall gates and trial banners ready
- ❌ **Implementation**: Not yet applied to actual pages

## 🏗️ Architecture

### Database Models

```sql
SubjectPlan (pricing for each subject)
├── subjectId: 1 (Math) or 4 (Chinese)
├── monthlyPrice: 20.00 or 40.00
└── features: JSON array

SubjectSubscription (user trials/subscriptions)
├── parentId: Links to Parent table
├── status: TRIAL | ACTIVE | EXPIRED
├── startDate/endDate: 3-day trial period
└── studentIds: Array of students covered

PaymentHistory (transaction records)
└── Tracks all payments and billing
```

### Core Components

#### 1. `SubscriptionGate` Component

**Location**: `src/components/SubscriptionGate.tsx`
**Purpose**: Blocks access when trial expires, shows trial status

```jsx
<SubscriptionGate subjectId={1} subjectName="Math">
  <MathPracticeComponent />
</SubscriptionGate>
```

#### 2. Access Control Functions

**Location**: `src/lib/subscription-access.ts`

- `checkStudentSubjectAccess()` - Client-side access checking
- `checkSubjectAccessServer()` - Server-side access checking
- `createTrialSubscription()` - Auto-creates 3-day trials

#### 3. Higher-Order Component

**Location**: `src/lib/with-subscription.tsx`

```jsx
const ProtectedMathPage = withSubscription(MathComponent, 1, "Math");
```

## 🎯 Implementation Steps

### Step 1: Protect Main Practice Pages

#### **Subject Practice Page**

**File**: `src/app/(dashboard)/student/practice/subject/[subjectId]/page.tsx`

```jsx
import SubscriptionGate from "@/components/SubscriptionGate";

export default function SubjectPracticePage({ params }) {
  const numericSubjectId = parseInt(params.subjectId, 10);

  // Only protect Math (1) and Chinese (4)
  if (numericSubjectId === 1 || numericSubjectId === 4) {
    const subjectName = numericSubjectId === 1 ? "Math" : "Chinese";

    return (
      <SubscriptionGate subjectId={numericSubjectId} subjectName={subjectName}>
        {/* Original page content */}
      </SubscriptionGate>
    );
  }

  // Other subjects remain free
  return <OriginalPageContent />;
}
```

### Step 2: Protect Chinese Practice Components

#### **Oral Reading Practice**

**File**: `src/app/(dashboard)/student/practice/chinese/oral/reading/page.tsx`

```jsx
import SubscriptionGate from "@/components/SubscriptionGate";

export default function PassageReadingListPage() {
  return (
    <SubscriptionGate subjectId={4} subjectName="Chinese">
      {/* Original page content */}
    </SubscriptionGate>
  );
}
```

#### **Oral Conversation Practice**

**File**: `src/app/(dashboard)/student/practice/chinese/oral/conversation/page.tsx`

```jsx
import SubscriptionGate from "@/components/SubscriptionGate";

export default function OralConversationPracticePage() {
  return (
    <SubscriptionGate subjectId={4} subjectName="Chinese">
      {/* Original page content */}
    </SubscriptionGate>
  );
}
```

#### **Reading Comprehension**

**File**: `src/app/(dashboard)/student/practice/chinese/reading-comprehension/[questionGroupId]/page.tsx`

```jsx
import SubscriptionGate from "@/components/SubscriptionGate";

export default function ReadingComprehensionPage() {
  return (
    <SubscriptionGate subjectId={4} subjectName="Chinese">
      {/* Original page content */}
    </SubscriptionGate>
  );
}
```

#### **Cloze Practice**

**File**: `src/app/(dashboard)/student/practice/chinese/cloze/[questionGroupId]/page.tsx`

```jsx
import SubscriptionGate from "@/components/SubscriptionGate";

export default function ClozePassagePage() {
  return (
    <SubscriptionGate subjectId={4} subjectName="Chinese">
      {/* Original page content */}
    </SubscriptionGate>
  );
}
```

### Step 3: Protect Math Practice Pages

#### **Topic Practice**

**File**: `src/app/(dashboard)/student/practice/topic/[topicId]/page.tsx`

Add subject detection and conditional protection:

```jsx
import SubscriptionGate from "@/components/SubscriptionGate";

export default function TopicalPracticePage() {
  // Get topic's subject ID from API or props
  const [topicSubjectId, setTopicSubjectId] =
    (useState < number) | (null > null);

  useEffect(() => {
    // Fetch topic details to get subject ID
    fetchTopicSubject();
  }, []);

  if (topicSubjectId === 1) {
    return (
      <SubscriptionGate subjectId={1} subjectName="Math">
        {/* Original page content */}
      </SubscriptionGate>
    );
  }

  return <OriginalPageContent />;
}
```

### Step 4: Add Trial Auto-Creation

#### **API Endpoint** (Optional)

Create automatic trial creation when users first access a subject:

**File**: `src/app/api/subscriptions/trial/route.ts`

```jsx
import { createTrialSubscription } from "@/lib/subscription-access";

export async function POST(request: Request) {
  const { parentId, subjectPlanId } = await request.json();

  const result = await createTrialSubscription(parentId, subjectPlanId);

  return Response.json(result);
}
```

## 🎨 User Experience Flow

### **New User Journey**

1. **Day 1-3**: Free access with trial banner showing "X days remaining"
2. **Day 4+**: Access blocked with upgrade prompt
3. **Payment**: Redirects to `/parent/pricing` page
4. **Post-payment**: Full access restored

### **Trial Banner Display**

```jsx
// Shows during trial period
"Free Trial: 2 days remaining [Upgrade Now]";

// Shows when expired
"Trial Ended - Subscribe Now [$20/month for Math]";
```

### **Blocked Access Screen**

- Clear messaging about trial expiration
- Prominent "Subscribe Now" button
- Pricing information
- "Back to Dashboard" option

## 🔧 Configuration Options

### **Pricing Adjustments**

Update pricing in: `scripts/seed-pricing.js`

```javascript
// Math pricing
monthlyPrice: 20.00,
yearlyPrice: 200.00,

// Chinese pricing
monthlyPrice: 40.00,
yearlyPrice: 400.00,
```

### **Trial Period**

Modify trial length in: `src/lib/subscription-access.ts`

```javascript
// Change from 3 days to different period
const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
```

### **Subject Configuration**

Add new subjects in: `scripts/seed-pricing.js`

```javascript
// Add new subject
const scienceSubject = await prisma.subject.findFirst({
  where: { name: "Science" },
});

const sciencePlan = await prisma.subjectPlan.upsert({
  // ... pricing configuration
});
```

## 🚀 Deployment Checklist

- [ ] **Database Migration**: `npx prisma db push` (already done)
- [ ] **Seed Pricing**: `node scripts/seed-pricing.js` (already done)
- [ ] **Wrap Pages**: Apply SubscriptionGate to target pages
- [ ] **Test Trials**: Create test accounts and verify trial flow
- [ ] **Payment Integration**: Connect Stripe for actual payments
- [ ] **Error Handling**: Test edge cases and error states
- [ ] **Analytics**: Add tracking for conversion metrics

## 🎛️ Testing Strategy

### **Manual Testing**

1. Create new parent account
2. Access Math/Chinese practice
3. Verify trial starts automatically
4. Wait for trial expiration (or modify database)
5. Confirm access is blocked
6. Test payment flow

### **Database Testing**

```sql
-- Check subscriptions
SELECT * FROM "SubjectSubscription" WHERE "parentId" = 'user_id';

-- Manually expire trial
UPDATE "SubjectSubscription"
SET "endDate" = NOW() - INTERVAL '1 day'
WHERE "parentId" = 'user_id';
```

## 🔄 Rollback Plan

If issues arise, remove paywall protection by:

1. **Remove SubscriptionGate imports**
2. **Remove wrapping components**
3. **Keep database schema** (for future re-implementation)

Database and utility functions remain harmless when not used.

---

## 💡 Implementation Notes

- **No impact on existing users** until pages are wrapped
- **Gradual rollout possible** - protect pages one by one
- **Free subjects remain free** (Science, English)
- **Parent dashboard** already has pricing page ready
- **Trial creation** can be manual or automatic
- **Payment integration** ready for Stripe connection

This system provides a clean, user-friendly paywall that respects the trial period and provides clear upgrade paths.
