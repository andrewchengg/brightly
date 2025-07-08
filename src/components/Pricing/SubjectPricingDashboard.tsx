import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FaToggleOn,
  FaToggleOff,
  FaSpinner,
  FaCreditCard,
  FaGift,
} from "react-icons/fa";
import { LuCalculator } from "react-icons/lu";
import { FaGlobe, FaFlask, FaBook } from "react-icons/fa";
import SubjectPricingCard from "./SubjectPricingCard";
import { toast } from "react-toastify";

interface SubjectPlan {
  id: number;
  subjectId: number;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  features: string[];
  isActive: boolean;
}

interface SubjectSubscription {
  id: string;
  subjectPlanId: number;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED" | "TRIAL";
  endDate: string;
  nextBillingDate: string;
}

interface SubjectInfo {
  id: number;
  name: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  bgColor: string;
  isAvailable: boolean;
}

interface SubjectPricingDashboardProps {
  className?: string;
}

const mockSubjects: SubjectInfo[] = [
  {
    id: 1,
    name: "Math",
    icon: LuCalculator,
    iconColor: "text-purple-600",
    bgColor: "bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-100",
    isAvailable: true,
  },
  {
    id: 4,
    name: "Chinese",
    icon: FaGlobe,
    iconColor: "text-amber-600",
    bgColor: "bg-gradient-to-br from-amber-100 via-orange-50 to-red-100",
    isAvailable: true,
  },
  {
    id: 2,
    name: "Science",
    icon: FaFlask,
    iconColor: "text-gray-400",
    bgColor: "bg-gradient-to-br from-gray-100 via-gray-50 to-slate-100",
    isAvailable: false,
  },
  {
    id: 3,
    name: "English",
    icon: FaBook,
    iconColor: "text-gray-400",
    bgColor: "bg-gradient-to-br from-gray-100 via-gray-50 to-slate-100",
    isAvailable: false,
  },
];

const mockSubjectPlans: SubjectPlan[] = [
  {
    id: 1,
    subjectId: 1,
    name: "Math Premium",
    description: "Complete GCSE Math curriculum with AI tutoring",
    monthlyPrice: 29,
    yearlyPrice: 299,
    features: [
      "Unlimited practice questions",
      "AI-powered tutoring",
      "Progress tracking & analytics",
      "Mock exams & assessments",
      "Parent progress reports",
      "24/7 support",
    ],
    isActive: true,
  },
  {
    id: 2,
    subjectId: 4,
    name: "Chinese Plus",
    description: "Mandarin language mastery with cultural context",
    monthlyPrice: 25,
    yearlyPrice: 250,
    features: [
      "Interactive listening exercises",
      "Cultural context lessons",
      "Character recognition practice",
      "Speaking practice with AI",
      "Parent progress dashboard",
      "Certificate of completion",
    ],
    isActive: true,
  },
  {
    id: 3,
    subjectId: 2,
    name: "Science Bundle",
    description: "Physics, Chemistry & Biology combined",
    monthlyPrice: 35,
    yearlyPrice: 350,
    features: [
      "All three sciences included",
      "Virtual lab experiments",
      "Interactive diagrams",
      "Video explanations",
      "Exam preparation",
      "Study schedules",
    ],
    isActive: false,
  },
  {
    id: 4,
    subjectId: 3,
    name: "English Complete",
    description: "Language arts and literature mastery",
    monthlyPrice: 27,
    yearlyPrice: 270,
    features: [
      "Grammar & composition",
      "Literature analysis",
      "Creative writing tools",
      "Reading comprehension",
      "Essay feedback",
      "Vocabulary building",
    ],
    isActive: false,
  },
];

const SubjectPricingDashboard: React.FC<SubjectPricingDashboardProps> = ({
  className = "",
}) => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [subscriptions, setSubscriptions] = useState<SubjectSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubscribe, setLoadingSubscribe] = useState<number | null>(null);

  // Mock current subscriptions - replace with actual API call
  useEffect(() => {
    // Simulate API call
    setSubscriptions([
      {
        id: "sub_1",
        subjectPlanId: 1,
        status: "ACTIVE",
        endDate: "2024-12-31",
        nextBillingDate: "2024-02-01",
      },
    ]);
  }, []);

  const handleSubscribe = async (
    subjectPlanId: number,
    cycle: "monthly" | "yearly"
  ) => {
    setLoadingSubscribe(subjectPlanId);
    try {
      // Simulate API call to create subscription
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Add to subscriptions
      const newSubscription: SubjectSubscription = {
        id: `sub_${Date.now()}`,
        subjectPlanId,
        status: "TRIAL",
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        nextBillingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      };

      setSubscriptions((prev) => [...prev, newSubscription]);
      toast.success("Successfully started 7-day free trial!");
    } catch (error) {
      toast.error("Failed to start subscription. Please try again.");
    } finally {
      setLoadingSubscribe(null);
    }
  };

  const handleManageSubscription = async (subjectPlanId: number) => {
    // Redirect to subscription management or open modal
    toast.info("Opening subscription management...");
  };

  const isSubscribed = (subjectPlanId: number) => {
    return subscriptions.some(
      (sub) =>
        sub.subjectPlanId === subjectPlanId &&
        ["ACTIVE", "TRIAL"].includes(sub.status)
    );
  };

  const totalSavings =
    billingCycle === "yearly"
      ? mockSubjectPlans.reduce((total, plan) => {
          if (plan.yearlyPrice) {
            return total + (plan.monthlyPrice * 12 - plan.yearlyPrice);
          }
          return total;
        }, 0)
      : 0;

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Choose Your Learning Path
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Unlock premium features for each subject with our flexible pricing
          plans. Start with a 7-day free trial on any subject.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center space-x-4">
        <span
          className={`text-lg font-medium ${
            billingCycle === "monthly" ? "text-gray-900" : "text-gray-500"
          }`}
        >
          Monthly
        </span>

        <button
          onClick={() =>
            setBillingCycle((prev) =>
              prev === "monthly" ? "yearly" : "monthly"
            )
          }
          className="relative"
        >
          {billingCycle === "yearly" ? (
            <FaToggleOn className="text-4xl text-indigo-600" />
          ) : (
            <FaToggleOff className="text-4xl text-gray-400" />
          )}
        </button>

        <div className="flex items-center space-x-2">
          <span
            className={`text-lg font-medium ${
              billingCycle === "yearly" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            Yearly
          </span>
          {billingCycle === "yearly" && (
            <Badge className="bg-green-100 text-green-700">
              <FaGift className="mr-1" />
              Save up to ${totalSavings}
            </Badge>
          )}
        </div>
      </div>

      {/* Active Subscriptions Summary */}
      {subscriptions.length > 0 && (
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center space-x-3 mb-4">
            <FaCreditCard className="text-green-600 text-xl" />
            <h3 className="text-lg font-semibold text-green-900">
              Your Active Subscriptions
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscriptions.map((sub) => {
              const plan = mockSubjectPlans.find(
                (p) => p.id === sub.subjectPlanId
              );
              const subject = mockSubjects.find(
                (s) => s.id === plan?.subjectId
              );
              if (!plan || !subject) return null;

              return (
                <div key={sub.id} className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {subject.name}
                      </h4>
                      <p className="text-sm text-gray-600">{plan.name}</p>
                    </div>
                    <Badge
                      className={
                        sub.status === "TRIAL"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }
                    >
                      {sub.status === "TRIAL" ? "Free Trial" : "Active"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {sub.status === "TRIAL" ? "Trial ends" : "Next billing"}:{" "}
                    {sub.nextBillingDate}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {mockSubjects.map((subject) => {
          const plan = mockSubjectPlans.find((p) => p.subjectId === subject.id);
          if (!plan) return null;

          return (
            <SubjectPricingCard
              key={subject.id}
              subject={subject}
              plan={plan}
              isSubscribed={isSubscribed(plan.id)}
              isLoading={loadingSubscribe === plan.id}
              billingCycle={billingCycle}
              onSubscribe={handleSubscribe}
              onManage={handleManageSubscription}
            />
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="text-center space-y-4 pt-8">
        <h3 className="text-2xl font-semibold text-gray-900">
          Ready to boost your child's learning?
        </h3>
        <p className="text-gray-600">
          Start with any subject today. No commitment, cancel anytime.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          <span>✓ 7-day free trial</span>
          <span>✓ Cancel anytime</span>
          <span>✓ 24/7 support</span>
          <span>✓ Money-back guarantee</span>
        </div>
      </div>
    </div>
  );
};

export default SubjectPricingDashboard;
