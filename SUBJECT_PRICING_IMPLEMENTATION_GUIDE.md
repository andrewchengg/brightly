# Subject-Based Pricing Implementation Guide

## 🎯 Overview

This guide outlines how to implement subject-based pricing for your education platform, allowing parents to subscribe to individual subjects (Math, Chinese, Science, English) with flexible monthly/yearly billing.

## 📁 Files Created

### Frontend Components

- `src/components/Pricing/SubjectPricingCard.tsx` - Individual subject pricing card
- `src/components/Pricing/SubjectPricingDashboard.tsx` - Main pricing dashboard
- `src/components/Practice/SubjectSelectionWithPricing.tsx` - Enhanced subject selection with pricing
- `src/app/(dashboard)/parent/pricing/page.tsx` - Dedicated pricing page for parents

### Backend Infrastructure

- `prisma/subject-pricing-schema.md` - Database schema extensions
- `src/app/api/subscriptions/route.ts` - API routes for subscription management (commented)

## 🗄️ Database Setup

### 1. Apply Schema Extensions

Add the models from `prisma/subject-pricing-schema.md` to your `prisma/schema.prisma`:

```bash
# Copy the models to your schema file
# Then run migration
npx prisma migrate dev --name add_subject_pricing
npx prisma generate
```

### 2. Seed Subject Plans

```sql
-- Insert subject plans
INSERT INTO "SubjectPlan" (id, subjectId, name, description, monthlyPrice, yearlyPrice, features, isActive) VALUES
(1, 1, 'Math Premium', 'Complete GCSE Math curriculum with AI tutoring', 29.00, 299.00, '["Unlimited practice questions", "AI-powered tutoring", "Progress tracking & analytics", "Mock exams & assessments", "Parent progress reports", "24/7 support"]', true),
(2, 4, 'Chinese Plus', 'Mandarin language mastery with cultural context', 25.00, 250.00, '["Interactive listening exercises", "Cultural context lessons", "Character recognition practice", "Speaking practice with AI", "Parent progress dashboard", "Certificate of completion"]', true),
(3, 2, 'Science Bundle', 'Physics, Chemistry & Biology combined', 35.00, 350.00, '["All three sciences included", "Virtual lab experiments", "Interactive diagrams", "Video explanations", "Exam preparation", "Study schedules"]', false),
(4, 3, 'English Complete', 'Language arts and literature mastery', 27.00, 270.00, '["Grammar & composition", "Literature analysis", "Creative writing tools", "Reading comprehension", "Essay feedback", "Vocabulary building"]', false);
```

## 💳 Payment Integration

### 1. Stripe Setup

```bash
npm install stripe @stripe/stripe-js
```

### 2. Environment Variables

```env
# Add to .env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Stripe Products & Prices

Create products in Stripe Dashboard or via API:

```javascript
// Create products for each subject plan
const mathProduct = await stripe.products.create({
  name: "Math Premium",
  description: "Complete GCSE Math curriculum with AI tutoring",
});

// Create prices for monthly/yearly billing
const mathMonthly = await stripe.prices.create({
  product: mathProduct.id,
  unit_amount: 2900, // $29.00
  currency: "usd",
  recurring: { interval: "month" },
});

const mathYearly = await stripe.prices.create({
  product: mathProduct.id,
  unit_amount: 29900, // $299.00
  currency: "usd",
  recurring: { interval: "year" },
});
```

## 🔧 API Implementation

### 1. Uncomment API Routes

Update `src/app/api/subscriptions/route.ts`:

- Uncomment the full implementation
- Add Stripe integration
- Test with your database schema

### 2. Additional API Routes Needed

```typescript
// src/app/api/subscriptions/webhooks/route.ts
// Handle Stripe webhooks for subscription updates

// src/app/api/subject-plans/route.ts
// Fetch available subject plans

// src/app/api/subscriptions/[id]/route.ts
// Individual subscription management
```

## 🎨 Frontend Integration

### 1. Update Menu Navigation

Add pricing link to parent menu in `src/components/Menu.tsx`:

```typescript
{
  icon: FaCreditCard,
  label: "Subscriptions",
  href: "/parent/pricing",
  visible: ["parent"],
},
```

### 2. Replace Subject Selection

In `src/app/(dashboard)/student/practice/page.tsx`, replace the existing subject grid with:

```typescript
import SubjectSelectionWithPricing from "@/components/Practice/SubjectSelectionWithPricing";

// Replace the existing subjects mapping with:
<SubjectSelectionWithPricing studentId={userId} />;
```

### 3. Add Access Control

Create middleware to check subject subscription status:

```typescript
// src/lib/access-control.ts
export async function hasSubjectAccess(
  userId: string,
  subjectId: number
): Promise<boolean> {
  // Check if user has active subscription for subject
  const subscription = await prisma.subjectSubscription.findFirst({
    where: {
      parentId: userId,
      subjectPlan: { subjectId },
      status: { in: ["ACTIVE", "TRIAL"] },
      endDate: { gte: new Date() },
    },
  });

  return !!subscription;
}
```

## 🔒 Security & Validation

### 1. Route Protection

```typescript
// Add to practice routes
export default async function PracticePage({
  params,
}: {
  params: { subjectId: string };
}) {
  const hasAccess = await hasSubjectAccess(userId, parseInt(params.subjectId));

  if (!hasAccess) {
    redirect("/parent/pricing?required=" + params.subjectId);
  }

  // ... rest of component
}
```

### 2. Trial Management

```typescript
// Auto-convert trials to paid subscriptions
// Add cron job or webhook handler
export async function handleTrialExpiration() {
  const expiredTrials = await prisma.subjectSubscription.findMany({
    where: {
      status: "TRIAL",
      endDate: { lte: new Date() },
    },
  });

  // Update to EXPIRED or convert to paid
}
```

## 📊 Analytics & Reporting

### 1. Subscription Dashboard

Create admin analytics in `src/app/(dashboard)/admin/subscriptions/page.tsx`:

- Active subscriptions by subject
- Monthly recurring revenue (MRR)
- Trial conversion rates
- Churn analysis

### 2. Parent Dashboard Integration

Add subscription overview to parent dashboard:

```typescript
// In UnifiedParentDashboard.tsx
const [subscriptions, setSubscriptions] = useState([]);

useEffect(() => {
  fetch("/api/subscriptions")
    .then((res) => res.json())
    .then(setSubscriptions);
}, []);
```

## 📧 Email Notifications

Set up automated emails:

- Trial started confirmation
- Trial ending reminder (3 days before)
- Payment successful
- Payment failed
- Subscription cancelled

## 🧪 Testing Strategy

### 1. Unit Tests

```typescript
// Test subscription creation
describe("Subscription API", () => {
  it("should create subscription with trial", async () => {
    const response = await POST("/api/subscriptions", {
      subjectPlanId: 1,
      billingCycle: "monthly",
      studentIds: ["student-1"],
    });

    expect(response.status).toBe(201);
    expect(response.data.status).toBe("TRIAL");
  });
});
```

### 2. E2E Tests

```typescript
// Test complete subscription flow
test("Parent can subscribe to subject", async ({ page }) => {
  await page.goto("/parent/pricing");
  await page.click('[data-testid="math-subscribe-monthly"]');
  await page.fill('[data-testid="card-number"]', "4242424242424242");
  await page.click('[data-testid="submit-payment"]');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

## 🚀 Deployment Checklist

- [ ] Database schema applied
- [ ] Stripe products/prices created
- [ ] Webhook endpoints configured
- [ ] Environment variables set
- [ ] Email templates created
- [ ] Analytics tracking implemented
- [ ] Access control middleware added
- [ ] Trial expiration handling
- [ ] Payment failure handling
- [ ] Subscription management UI
- [ ] Admin dashboard analytics
- [ ] Customer support integration

## 💰 Pricing Strategy Recommendations

### Suggested Pricing Tiers

1. **Math Premium**: $29/month, $299/year (17% savings)
2. **Chinese Plus**: $25/month, $250/year (17% savings)
3. **Science Bundle**: $35/month, $350/year (17% savings)
4. **English Complete**: $27/month, $270/year (17% savings)

### Bundle Options (Future)

- **All Subjects**: $99/month, $999/year (25% savings)
- **STEM Bundle**: Math + Science - $55/month, $550/year (15% savings)
- **Languages Bundle**: Chinese + English - $45/month, $450/year (13% savings)

## 📈 Success Metrics

Track these KPIs:

- **Trial-to-Paid Conversion Rate**: Target 15-25%
- **Monthly Churn Rate**: Target <5%
- **Average Revenue Per User (ARPU)**
- **Customer Lifetime Value (CLV)**
- **Net Promoter Score (NPS)**

## 🔄 Future Enhancements

1. **Family Plans**: Multiple children, bulk discounts
2. **School Licenses**: Institution-wide subscriptions
3. **Referral Program**: Credits for referring families
4. **Seasonal Promotions**: Back-to-school, holiday discounts
5. **Usage-Based Pricing**: Pay per practice session
6. **Premium Features**: 1-on-1 tutoring, custom content

---

This implementation provides a solid foundation for subject-based pricing while maintaining flexibility for future enhancements and business model iterations.
