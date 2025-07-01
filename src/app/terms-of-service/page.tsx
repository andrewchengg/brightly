import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="font-bold text-2xl text-slate-900">
              Brightly
            </Link>
            <Link
              href="/"
              className="text-gray-600 hover:text-purple-800 transition-colors duration-200"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Terms of Service
        </h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-8">
            <strong>Last updated:</strong> December 30, 2024
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              By accessing and using Brightly ("the Service"), you accept and
              agree to be bound by the terms and provision of this agreement. If
              you do not agree to abide by these terms, please do not use this
              service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Brightly is an AI-powered educational platform that provides
              personalized tutoring, practice questions, mock exams, and
              learning analytics for students. Our service includes:
            </p>
            <ul className="text-gray-700 leading-relaxed mb-4 list-disc list-inside">
              <li>24/7 AI tutoring assistance</li>
              <li>Personalized practice sessions</li>
              <li>Mock examinations and assessments</li>
              <li>Progress tracking and analytics</li>
              <li>Question bank and study materials</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              3. User Accounts
            </h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Account Registration
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You must provide accurate and complete information when creating
              an account. You are responsible for maintaining the
              confidentiality of your account credentials.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Student Accounts
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Students under 18 years of age must have parental consent to use
              our service. Parents are responsible for monitoring their child's
              use of the platform.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Account Termination
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We reserve the right to terminate accounts that violate these
              terms or engage in inappropriate behavior on the platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. Acceptable Use
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="text-gray-700 leading-relaxed mb-4 list-disc list-inside">
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>
                Share, sell, or distribute content from our platform without
                permission
              </li>
              <li>Attempt to reverse engineer or hack our systems</li>
              <li>Upload malicious content or spam</li>
              <li>Impersonate other users or provide false information</li>
              <li>
                Use automated systems to access the service without permission
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              5. Intellectual Property
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              All content on Brightly, including questions, explanations, AI
              responses, and educational materials, is owned by Brightly or
              licensed to us. Users retain ownership of their personal data and
              responses but grant us a license to use this data to improve our
              services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              6. Payment and Subscription
            </h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Free Trial
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We offer a free trial period. No payment information is required
              during the trial.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Subscription Plans
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Paid subscriptions provide access to premium features.
              Subscription fees are charged in advance and are non-refundable
              except as required by law.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Cancellation
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You may cancel your subscription at any time. Cancellation will
              take effect at the end of the current billing period.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. Educational Use
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our AI tutoring is designed to supplement, not replace,
              traditional education. We encourage students to use our platform
              as a learning aid while continuing to engage with their teachers
              and coursework.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              8. Limitation of Liability
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Brightly is provided "as is" without warranties of any kind. We do
              not guarantee specific educational outcomes or exam results. Our
              liability is limited to the amount paid for the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              9. Privacy
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Your privacy is important to us. Please review our Privacy Policy
              to understand how we collect, use, and protect your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              10. Changes to Terms
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We reserve the right to modify these terms at any time. Users will
              be notified of significant changes, and continued use of the
              service constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              11. Governing Law
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              These terms are governed by the laws of Singapore. Any disputes
              will be resolved in Singapore courts.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              12. Contact Information
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about these Terms of Service, please contact
              us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Email:</strong> legal@brightly.com
                <br />
                <strong>Address:</strong> Brightly Education, Singapore
                <br />
                <strong>Support:</strong> support@brightly.com
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
