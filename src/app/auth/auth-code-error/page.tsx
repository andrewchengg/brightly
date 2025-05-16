import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="mb-6">
          There was a problem authenticating your account. Please try again.
        </p>
        <div className="flex flex-col gap-4">
          <Link 
            href="/sign-in" 
            className="inline-block px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Return to Sign In
          </Link>
          <Link 
            href="/sign-up" 
            className="inline-block px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create a New Account
          </Link>
        </div>
      </div>
    </div>
  )
} 