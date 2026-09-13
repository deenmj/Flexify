import React from 'react';

export default function HowItWorks() {
  return (
    <div className="bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">How Rentify Works</h2>
          <p className="mt-4 text-xl text-gray-500">Your free vehicle marketplace in Sri Lanka.</p>
        </div>
        
        <div className="mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Renting a Vehicle</h3>
            <ul className="space-y-4 text-gray-600">
              <li>1. Browse our extensive collection of vehicles available for rent.</li>
              <li>2. Filter by location, price, and vehicle type.</li>
              <li>3. Book the vehicle directly and communicate with the owner.</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Buying or Selling</h3>
            <ul className="space-y-4 text-gray-600">
              <li>1. Browse vehicle sale listings for free.</li>
              <li>2. If selling, create an account and list your vehicle at no cost.</li>
              <li>3. Connect with buyers directly.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
