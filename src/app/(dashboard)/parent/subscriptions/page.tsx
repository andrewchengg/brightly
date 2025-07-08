"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FaCrown,
  FaGift,
  FaCreditCard,
  FaPlus,
  FaCog,
  FaCalendarAlt,
  FaSpinner,
} from "react-icons/fa";
import { LuCalculator } from "react-icons/lu";
import { FaGlobe, FaFlask, FaBook } from "react-icons/fa";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

interface SubjectSubscription {
  id: string;
  status: "TRIAL" | "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
  startDate: string;
  endDate: string;
  nextBillingDate?: string;
  subjectPlan: {
    id: number;
    name: string;
    description?: string;
    monthlyPrice: number;
    yearlyPrice?: number;
    features: string[];
    subject: {
      id: number;
      name: string;
    };
  };
}

interface Child {
  id: string;
  name: string;
  username: string;
  level: number;
}

const subjectIcons = {
  Math: LuCalculator,
  Chinese: FaGlobe,
  Science: FaFlask,
  English: FaBook,
};

const subjectColors = {
  Math: {
    bg: "bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-100",
    icon: "text-purple-600",
    border: "border-purple-200",
  },
  Chinese: {
    bg: "bg-gradient-to-br from-amber-100 via-orange-50 to-red-100",
    icon: "text-amber-600",
    border: "border-amber-200",
  },
  Science: {
    bg: "bg-gradient-to-br from-green-100 via-green-50 to-emerald-100",
    icon: "text-green-600",
    border: "border-green-200",
  },
  English: {
    bg: "bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100",
    icon: "text-blue-600",
    border: "border-blue-200",
  },
};

export default function ParentSubscriptionsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [subscriptions, setSubscriptions] = useState<SubjectSubscription[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
    fetchChildren();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view subscriptions");
        router.push("/sign-in");
        return;
      }

      // For now, we'll use mock data since the API isn't implemented yet
      // In production, replace with: const response = await fetch('/api/subscriptions');
      const mockSubscriptions: SubjectSubscription[] = [
        {
          id: "sub_1",
          status: "TRIAL",
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          nextBillingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          subjectPlan: {
            id: 1,
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
            subject: {
              id: 1,
              name: "Math",
            },
          },
        },
        {
          id: "sub_2",
          status: "TRIAL",
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          nextBillingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          subjectPlan: {
            id: 2,
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
            subject: {
              id: 4,
              name: "Chinese",
            },
          },
        },
      ];

      setSubscriptions(mockSubscriptions);
    } catch (err: any) {
      console.error("Error fetching subscriptions:", err);
      setError("Failed to load subscriptions");
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async () => {
    try {
      const response = await fetch("/api/parent/children");
      if (response.ok) {
        const data = await response.json();
        setChildren(data.children || []);
      }
    } catch (err) {
      console.error("Error fetching children:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "TRIAL":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
            <FaGift className="mr-1" />
            Free Trial
          </Badge>
        );
      case "ACTIVE":
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-200">
            <FaCrown className="mr-1" />
            Premium
          </Badge>
        );
      case "PAUSED":
        return (
          <Badge className="bg-gray-100 text-gray-800 border border-gray-200">
            Paused
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-red-100 text-red-800 border border-red-200">
            Cancelled
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge className="bg-red-100 text-red-800 border border-red-200">
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4 mx-auto" />
          <p className="text-gray-600">Loading your subscriptions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                My Subscriptions
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your learning subscriptions and billing
              </p>
            </div>
            <Button
              onClick={() => router.push("/parent/pricing")}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <FaPlus className="mr-2" />
              Add Subject
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {subscriptions.length === 0 ? (
          // No subscriptions state
          <div className="text-center py-12">
            <FaCreditCard className="text-6xl text-gray-300 mb-6 mx-auto" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              No Active Subscriptions
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start your child's learning journey today with our premium
              subjects. Each subscription includes a 3-day free trial.
            </p>
            <Button
              onClick={() => router.push("/parent/pricing")}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Browse Subjects
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Trial Notice */}
            {subscriptions.some((sub) => sub.status === "TRIAL") && (
              <Card className="p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-amber-200">
                <div className="flex items-center space-x-3">
                  <FaGift className="text-2xl text-amber-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900">
                      Welcome! You're on a free trial
                    </h3>
                    <p className="text-amber-700">
                      Enjoy full access to all features during your 3-day trial
                      period.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Subscriptions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {subscriptions.map((subscription) => {
                const subject = subscription.subjectPlan.subject;
                const IconComponent =
                  subjectIcons[subject.name as keyof typeof subjectIcons] ||
                  FaBook;
                const colors =
                  subjectColors[subject.name as keyof typeof subjectColors] ||
                  subjectColors.English;
                const daysRemaining = getDaysRemaining(subscription.endDate);

                return (
                  <Card
                    key={subscription.id}
                    className={`overflow-hidden border-2 ${colors.border}`}
                  >
                    {/* Header */}
                    <div className={`p-6 ${colors.bg}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-3 rounded-xl bg-white/20 ${colors.icon}`}
                          >
                            <IconComponent className="text-2xl" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">
                              {subject.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {subscription.subjectPlan.name}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(subscription.status)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                      {/* Status and dates */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Status:</span>
                          <span className="font-medium text-gray-900">
                            {subscription.status === "TRIAL"
                              ? "Free Trial"
                              : subscription.status}
                          </span>
                        </div>

                        {subscription.status === "TRIAL" &&
                          daysRemaining >= 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                Trial ends in:
                              </span>
                              <span className="font-medium text-amber-600">
                                {daysRemaining}{" "}
                                {daysRemaining === 1 ? "day" : "days"}
                              </span>
                            </div>
                          )}

                        {subscription.status === "ACTIVE" &&
                          subscription.nextBillingDate && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                Next billing:
                              </span>
                              <span className="font-medium text-gray-900">
                                {formatDate(subscription.nextBillingDate)}
                              </span>
                            </div>
                          )}

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Started:</span>
                          <span className="font-medium text-gray-900">
                            {formatDate(subscription.startDate)}
                          </span>
                        </div>
                      </div>

                      {/* Children with access */}
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          Children with access:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {children.map((child) => (
                            <Badge
                              key={child.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {child.name}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">
                            Monthly:
                          </span>
                          <span className="font-medium">
                            ${subscription.subjectPlan.monthlyPrice}
                          </span>
                        </div>
                        {subscription.subjectPlan.yearlyPrice && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Yearly:
                            </span>
                            <span className="font-medium text-green-600">
                              ${subscription.subjectPlan.yearlyPrice}
                              <span className="text-xs ml-1">
                                (Save{" "}
                                {Math.round(
                                  (1 -
                                    subscription.subjectPlan.yearlyPrice /
                                      12 /
                                      subscription.subjectPlan.monthlyPrice) *
                                    100
                                )}
                                %)
                              </span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2 pt-2">
                        {subscription.status === "TRIAL" && (
                          <Button
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => router.push("/parent/pricing")}
                          >
                            Upgrade to Premium
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toast.info("Subscription management coming soon")
                          }
                        >
                          <FaCog className="mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/parent/pricing")}
                  className="flex items-center justify-center space-x-2"
                >
                  <FaPlus />
                  <span>Add More Subjects</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => toast.info("Billing history coming soon")}
                  className="flex items-center justify-center space-x-2"
                >
                  <FaCalendarAlt />
                  <span>Billing History</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push("/parent/children")}
                  className="flex items-center justify-center space-x-2"
                >
                  <FaCog />
                  <span>Manage Children</span>
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
