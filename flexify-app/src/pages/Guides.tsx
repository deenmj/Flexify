import React from 'react';
import { Link } from 'react-router-dom';

const guides = [
  { id: 1, title: 'Things to Check Before Renting a Car in Sri Lanka', excerpt: 'Essential tips for renting a vehicle in Sri Lanka, from insurance to road rules.' },
  { id: 2, title: 'How to Choose the Right Vehicle for Your Trip', excerpt: 'A guide to matching your travel itinerary with the perfect vehicle type.' },
  { id: 3, title: 'Understanding Vehicle Insurance Options', excerpt: 'Decoding rental insurance policies and what they actually cover.' },
  { id: 4, title: 'Top 10 Road Trip Destinations in Sri Lanka', excerpt: 'Discover the most scenic routes and must-visit spots across the island.' },
  { id: 5, title: 'Tips for Selling Your Vehicle Fast', excerpt: 'Expert advice on listing, pricing, and negotiating your vehicle sale.' },
  { id: 6, title: 'What to Look for When Buying a Used Car', excerpt: 'A comprehensive checklist for inspecting and test-driving a used vehicle.' },
  { id: 7, title: 'Navigating Traffic and Parking in Colombo', excerpt: 'A practical guide to driving and finding parking in the capital city.' },
  { id: 8, title: 'Fuel Economy Tips for Long Drives', excerpt: 'How to maximize your mileage and save money on fuel during road trips.' },
  { id: 9, title: 'Essential Items to Pack in Your Rental Car', excerpt: 'A checklist of must-have items for a comfortable and safe journey.' },
];

export default function Guides() {
  return (
    <div className="bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Guides & Resources</h2>
          <p className="mt-4 text-xl text-gray-500">Helpful articles for renters, buyers, and sellers on Rentify.</p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <div key={guide.id} className="border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{guide.title}</h3>
                <p className="text-gray-600 mb-4">{guide.excerpt}</p>
                <Link to="#" className="text-blue-600 hover:text-blue-800 font-medium">Read more →</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
