import React from "react";
import { CuteLoader, StudyLoader } from "./CuteLoader";

export const LoadingShowcase: React.FC = () => {
  return (
    <div className="p-6 bg-gray-50 rounded-lg space-y-8">
      <h3 className="text-lg font-semibold text-center text-gray-700">
        Cute Loading Animations Showcase
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Bouncing Dots */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-sm font-medium text-gray-600 mb-4">
            Bouncing Dots
          </h4>
          <CuteLoader variant="dots" text="Loading content..." />
        </div>

        {/* Pulse Animation */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-sm font-medium text-gray-600 mb-4">
            Pulse Animation
          </h4>
          <CuteLoader variant="pulse" text="Processing..." />
        </div>

        {/* Bounce Animation */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-sm font-medium text-gray-600 mb-4">
            Bounce Animation
          </h4>
          <CuteLoader variant="bounce" text="Almost ready..." />
        </div>

        {/* Study Loader - Light Theme */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-sm font-medium text-gray-600 mb-4">
            Study Loader (Light)
          </h4>
          <StudyLoader text="Learning in progress..." theme="light" />
        </div>

        {/* Study Loader - Dark Theme */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border">
          <h4 className="text-sm font-medium text-white mb-4">
            Study Loader (Dark)
          </h4>
          <StudyLoader text="Signing you in..." theme="dark" />
        </div>

        {/* Small Size Example */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-sm font-medium text-gray-600 mb-4">Small Size</h4>
          <CuteLoader variant="dots" text="Quick load..." size="sm" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          ✨ These animations make waiting more delightful! ✨
        </p>
      </div>
    </div>
  );
};

export default LoadingShowcase;
