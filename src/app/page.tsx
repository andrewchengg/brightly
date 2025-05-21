"use client";

import { useSupabaseUser, useUserRole } from "@/lib/hooks/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';

const Homepage = () => {
  const router = useRouter();
  const { user, isLoaded } = useSupabaseUser();
  const { role, isLoaded: isRoleLoaded } = useUserRole();

  // Redirect based on user role only if user is authenticated and has a role
  useEffect(() => {
    if (isLoaded && isRoleLoaded && user && role) {
      router.push(`/${role}`);
    }
  }, [isLoaded, isRoleLoaded, role, router, user]);

  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed w-full bg-white shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-blue-600">Edcel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/sign-in" 
                className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link 
                href="/sign-up" 
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Get Ready for PSLE</span>
              <span className="block text-blue-600">The Right Way</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Master the PSLE syllabus through lessons, practice sessions and curated, simulated mock exams.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  href="/sign-up"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 md:py-4 md:text-lg md:px-10"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center group hover:transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white mx-auto group-hover:bg-blue-700 transition-colors duration-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">Backed By Ex-MOE Teachers</h3>
              <p className="mt-2 text-base text-gray-500">
                Learn using content prepared by experienced teachers
              </p>
            </div>
            <div className="text-center group hover:transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white mx-auto group-hover:bg-blue-700 transition-colors duration-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">Practice Sessions</h3>
              <p className="mt-2 text-base text-gray-500">
                Improve your skills with our curated practice content
              </p>
            </div>
            <div className="text-center group hover:transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white mx-auto group-hover:bg-blue-700 transition-colors duration-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">Mock Exams</h3>
              <p className="mt-2 text-base text-gray-500">
                Test your knowledge with simulated PSLE exams
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Homepage;
