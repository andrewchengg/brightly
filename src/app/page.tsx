"use client";

// Test deployment change - verifying automatic deployment works
import { useSupabaseUser, useUserRole } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

// Rotating Pain Points Component
const RotatingPainPoints = () => {
  const painPoints = [
    "Worried your child isn't getting 24/7 support?",
    "Tired of expensive tuition fees with little improvement",
    "Finding it hard to track your child's real progress?",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % painPoints.length);
        setIsVisible(true);
      }, 500);
    }, 3500); // Slightly longer for pain points

    return () => clearInterval(interval);
  }, [painPoints.length]);

  return (
    <h1
      className={`text-4xl md:text-6xl lg:text-7xl text-gray-900 max-w-5xl mx-auto transition-opacity duration-500 font-bold leading-tight ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {painPoints[currentIndex]}
    </h1>
  );
};

// Animated Counter Component
const AnimatedCounter = ({
  end,
  duration = 2000,
  suffix = "",
}: {
  end: number;
  duration?: number;
  suffix?: string;
}) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const increment = end / (duration / 16);
          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return (
    <div ref={ref} className="text-4xl font-black mb-2">
      {count.toLocaleString()}
      {suffix}
    </div>
  );
};

const Homepage = () => {
  const router = useRouter();
  const { user, isLoaded } = useSupabaseUser();
  const { role, isLoaded: isRoleLoaded } = useUserRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Redirect based on user role only if user is authenticated and has a role
  useEffect(() => {
    if (isLoaded && isRoleLoaded && user && role) {
      router.push(`/${role}`);
    }
  }, [isLoaded, isRoleLoaded, role, router, user]);

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md shadow-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex-shrink-0">
              <h1 className="font-bold text-4xl text-slate-900 tracking-tight hover:text-slate-700 transition-colors duration-300">
                Brightly
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection("features")}
                className="text-slate-700 hover:text-slate-900 font-semibold transition-colors duration-300"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-slate-700 hover:text-slate-900 font-semibold transition-colors duration-300"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="text-slate-700 hover:text-slate-900 font-semibold transition-colors duration-300"
              >
                About
              </button>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/sign-in"
                className="text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Login
              </Link>
              <Link
                href="/sign-up"
                className="bg-purple-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-purple-900 transition-colors duration-200"
              >
                Try Brightly
              </Link>
            </div>
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-blue-600 p-2"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-20 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-lg">
              <div className="px-4 py-6 space-y-4">
                <button
                  onClick={() => scrollToSection("features")}
                  className="block text-slate-700 hover:text-slate-900 font-semibold transition-colors duration-300"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection("pricing")}
                  className="block text-slate-700 hover:text-slate-900 font-semibold transition-colors duration-300"
                >
                  Pricing
                </button>
                <button
                  onClick={() => scrollToSection("about")}
                  className="block text-slate-700 hover:text-slate-900 font-semibold transition-colors duration-300"
                >
                  About
                </button>
                <div className="pt-4 space-y-2">
                  <Link
                    href="/sign-in"
                    className="block w-full text-center text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    href="/sign-up"
                    className="block w-full text-center bg-purple-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-900 transition-colors duration-200"
                  >
                    Try Brightly
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-4 relative">
        {/* Removed decorative background circles for a cleaner look */}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Main Pain Points Header */}
          <div className="mb-12 min-h-[140px] flex items-center justify-center">
            <RotatingPainPoints />
          </div>
        </div>
      </section>

      {/* Try the Brightly Way Section */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4">
            Try the <span className="text-purple-800">Brightly</span> way
          </h2>

          {/* Subtitle Text */}

          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Boost your grades to AL1 with our platform today
          </p>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-6 rounded-3xl shadow-lg">
            <div className="relative bg-black rounded-2xl overflow-hidden shadow-xl">
              {/* Video Container */}
              <div className="w-full">
                <video
                  className="w-full h-auto object-contain"
                  autoPlay
                  loop
                  preload="auto"
                  playsInline
                  muted
                >
                  <source src="/practicesession.mov" type="video/mp4" />
                  <source src="/practicesession.mov" type="video/quicktime" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* CTA Button */}
          <div className="mb-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center bg-purple-800 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-purple-900 transition-colors duration-200"
            >
              Try now for free
            </Link>
          </div>

          {/* No credit card required */}
          <p className="text-gray-500 text-sm mb-8">No credit card required</p>
        </div>
      </section>

      {/* Benefits Section */}

      <section className="py-8">
        <h2 className="text-xl text-gray-700 max-w-3xl mx-auto mb-4 font-medium">
          Forget rote memorization, we build your child's ability to think
          critically, question by question.
        </h2>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            <div className="bg-white p-8 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Instant Help
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                <strong>24/7 AI tutor</strong> breaks down complex problems
                step-by-step. Never get stuck again.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Mock Exams
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Practice under real exam conditions while our detailed analytics
                reveal your weaknesses and guide your study focus.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2 a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Track Progress
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                <strong>Detailed analytics</strong> show exactly where you're
                improving. Celebrate every win.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Question Bank
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Your personalized repository of challenging questions,
                automatically organized by weakness for targeted review.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Unlimited Practice
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Unlimited topical practice, anytime, anywhere. Master every
                concept at your own pace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Example Section */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Example English Question
                </h3>
                <div className="text-sm text-gray-600 mb-4">4 marks</div>
                <p className="text-gray-700">
                  Analyze the use of metaphor in the following passage and
                  explain how it contributes to the author's portrayal of the
                  character's emotional state.
                </p>
              </div>
              <div className="md:col-span-2">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Brightly solve together
                </h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Let's break this down step by step. First, I'll help you
                    identify the metaphors in the passage, then we'll analyze
                    their effect on characterization. The metaphor "her heart
                    was a caged bird" suggests...
                  </p>
                  <div className="mt-3 flex items-center text-purple-800 text-sm">
                    <span>✓ Step-by-step guidance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subject Cards Section */}
      <section id="features" className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="p-8 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-purple-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Math</h3>
              <p className="text-gray-600 mb-4">
                Get step-by-step guidance to solve maths problems.
              </p>
              <button className="text-purple-800 hover:text-purple-900 font-medium">
                Try it now →
              </button>
            </div>

            <div className="p-8 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-purple-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">English</h3>
              <p className="text-gray-600 mb-4">
                Learn how to structure your answers for each question.
              </p>
              <button className="text-purple-800 hover:text-purple-900 font-medium">
                Try it now →
              </button>
            </div>

            <div className="p-8 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-purple-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Science</h3>
              <p className="text-gray-600 mb-4">
                Apply your knowledge in 'Explain', and 'Suggest' questions.
              </p>
              <button className="text-purple-800 hover:text-purple-900 font-medium">
                Try it now →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of students improving their grades with AI tutoring
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center bg-purple-800 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-900 transition-colors duration-200"
          >
            Try now for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center space-x-6 text-xs text-gray-500">
            <Link
              href="/privacy-policy"
              className="hover:text-gray-700 transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <span>•</span>
            <Link
              href="/terms-of-service"
              className="hover:text-gray-700 transition-colors duration-200"
            >
              Terms of Service
            </Link>
            <span>•</span>
            <span>© 2024 Brightly</span>
          </div>
        </div>
      </footer>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-purple-800 text-white p-3 rounded-full shadow-lg hover:bg-purple-900 transition-colors duration-200"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Homepage;
