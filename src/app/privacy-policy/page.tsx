import Link from "next/link";

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-8">
            <strong>Last updated:</strong> December 30, 2024
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              1. Introduction
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Welcome to Brightly ("we," "our," or "us"). We are committed to
              protecting your privacy and ensuring the security of your personal
              information. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our
              educational platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. Information We Collect
            </h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Personal Information
            </h3>
            <ul className="text-gray-700 leading-relaxed mb-4 list-disc list-inside">
              <li>
                Name and contact information (email address, phone number)
              </li>
              <li>
                Student academic information (grade level, subjects, school)
              </li>
              <li>Parent/guardian information for student accounts</li>
              <li>Account credentials and preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Educational Data
            </h3>
            <ul className="text-gray-700 leading-relaxed mb-4 list-disc list-inside">
              <li>Learning progress and performance data</li>
              <li>Practice session results and analytics</li>
              <li>Questions asked and answers provided</li>
              <li>Usage patterns and learning preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Technical Information
            </h3>
            <ul className="text-gray-700 leading-relaxed mb-4 list-disc list-inside">
              <li>Device information and browser type</li>
              <li>IP address and location data</li>
              <li>Usage analytics and session data</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              3. How We Use Your Information
            </h2>
            <ul className="text-gray-700 leading-relaxed mb-4 list-disc list-inside">
              <li>Provide personalized learning experiences and AI tutoring</li>
              <li>
                Track learning progress and generate performance analytics
              </li>
              <li>Communicate with you about your account and our services</li>
              <li>Improve our platform and develop new features</li>
              <li>Ensure platform security and prevent fraud</li>
              <li>Comply with legal obligations and educational regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. Information Sharing
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information to third
              parties. We may share information only in the following
              circumstances:
            </p>
            <ul className="text-gray-700 leading-relaxed mb-4 list-disc list-inside">
              <li>With your explicit consent</li>
              <li>
                With parents/guardians for student accounts (as required by law)
              </li>
              <li>To comply with legal requirements or court orders</li>
              <li>
                To protect our rights, property, or safety, or that of our users
              </li>
              <li>
                With service providers who help us operate our platform (under
                strict confidentiality agreements)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              5. Data Security
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement robust security measures to protect your information,
              including:
            </p>
            <ul className="text-gray-700 leading-relaxed mb-4 list-disc list-inside">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication requirements</li>
              <li>Staff training on data protection and privacy</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              6. Children's Privacy
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We take special care to protect the privacy of children under 13.
              We comply with applicable children's privacy laws and require
              parental consent before collecting personal information from
              children. Parents have the right to review, modify, or delete
              their child's information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. Your Rights
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="text-gray-700 leading-relaxed mb-4 list-disc list-inside">
              <li>Access and review your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Delete your account and associated data</li>
              <li>Object to certain processing activities</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              8. Contact Us
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or our data
              practices, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Email:</strong> privacy@brightly.com
                <br />
                <strong>Address:</strong> Brightly Education, Singapore
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
