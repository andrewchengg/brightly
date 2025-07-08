import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FaCheck, FaCrown, FaLock, FaSpinner } from "react-icons/fa";
import { LuCalculator } from "react-icons/lu";
import { FaGlobe, FaFlask, FaBook } from "react-icons/fa";

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

interface SubjectInfo {
  id: number;
  name: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  bgColor: string;
  isAvailable: boolean;
}

interface SubjectPricingCardProps {
  subject: SubjectInfo;
  plan: SubjectPlan;
  isSubscribed: boolean;
  isLoading: boolean;
  billingCycle: "monthly" | "yearly";
  onSubscribe: (
    subjectPlanId: number,
    billingCycle: "monthly" | "yearly"
  ) => void;
  onManage: (subjectPlanId: number) => void;
  className?: string;
}

const subjectIcons = {
  Math: LuCalculator,
  Chinese: FaGlobe,
  Science: FaFlask,
  English: FaBook,
};

const SubjectPricingCard: React.FC<SubjectPricingCardProps> = ({
  subject,
  plan,
  isSubscribed,
  isLoading,
  billingCycle,
  onSubscribe,
  onManage,
  className = "",
}) => {
  const IconComponent =
    subjectIcons[subject.name as keyof typeof subjectIcons] || FaBook;
  const price =
    billingCycle === "yearly" && plan.yearlyPrice
      ? plan.yearlyPrice
      : plan.monthlyPrice;
  const originalMonthlyPrice = plan.monthlyPrice;
  const yearlySavings = plan.yearlyPrice
    ? ((originalMonthlyPrice * 12 - plan.yearlyPrice) /
        (originalMonthlyPrice * 12)) *
      100
    : 0;

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl border-2 ${
        isSubscribed
          ? "border-green-200 bg-green-50"
          : "border-gray-200 hover:border-indigo-300"
      } ${className}`}
    >
      {/* Header with Subject Info */}
      <div className={`p-6 ${subject.bgColor}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-white/20 ${subject.iconColor}`}>
              <IconComponent className="text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {subject.name}
              </h3>
              <p className="text-sm text-gray-600">{plan.name}</p>
            </div>
          </div>
          {isSubscribed && (
            <Badge className="bg-green-500 text-white">
              <FaCrown className="mr-1" />
              Subscribed
            </Badge>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center space-x-1">
            <span className="text-4xl font-bold text-gray-900">${price}</span>
            <span className="text-lg text-gray-500">
              /{billingCycle === "yearly" ? "year" : "month"}
            </span>
          </div>

          {billingCycle === "yearly" &&
            plan.yearlyPrice &&
            yearlySavings > 0 && (
              <div className="mt-2">
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700"
                >
                  Save {yearlySavings.toFixed(0)}%
                </Badge>
                <p className="text-sm text-gray-500 mt-1">
                  ${originalMonthlyPrice}/month billed annually
                </p>
              </div>
            )}

          {plan.description && (
            <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2">
              <FaCheck className="text-green-500 text-sm flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="space-y-2">
          {!subject.isAvailable ? (
            <Button disabled className="w-full">
              <FaLock className="mr-2" />
              Coming Soon
            </Button>
          ) : isSubscribed ? (
            <Button
              variant="outline"
              onClick={() => onManage(plan.id)}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                "Manage Subscription"
              )}
            </Button>
          ) : (
            <Button
              onClick={() => onSubscribe(plan.id, billingCycle)}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isLoading ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                `Subscribe ${billingCycle === "yearly" ? "Yearly" : "Monthly"}`
              )}
            </Button>
          )}

          {!isSubscribed && subject.isAvailable && (
            <p className="text-xs text-gray-500 text-center">
              Cancel anytime • 7-day free trial
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SubjectPricingCard;
