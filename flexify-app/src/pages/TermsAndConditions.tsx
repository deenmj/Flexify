import React from 'react';

export default function TermsAndConditions() {
  return (
    <div className="bg-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Terms and Conditions</h1>
        <div className="prose prose-blue max-w-none">
          <p>Welcome to Rentify. By accessing or using our platform, you agree to be bound by these Terms and Conditions.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">1. The Service</h2>
          <p>Rentify provides a free vehicle marketplace for users to list vehicles for rent, buy, or sell. We do not own any of the vehicles listed on our platform.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">2. User Accounts</h2>
          <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">3. Listing Rules</h2>
          <p>All listings must be accurate and relate to actual vehicles. You may not list illegal, stolen, or unsafe vehicles.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">4. Liability</h2>
          <p>Rentify is not a party to any rental or sales agreement between users. We are not responsible for vehicle conditions, payment disputes, or user behavior.</p>
        </div>
      </div>
    </div>
  );
}
