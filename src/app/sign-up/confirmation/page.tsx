"use client"
import Link from "next/link"

export default function SignUpConfirmationPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Check your email</h1>
        <p className="mb-6">
          We've sent you a confirmation email. Please check your inbox and follow the instructions to complete your registration.
        </p>
        <Link 
          href="/sign-in" 
          className="inline-block px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  )
} 