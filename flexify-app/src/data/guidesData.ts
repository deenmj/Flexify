export interface Guide {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'Renter' | 'Owner' | 'General';
  content: string;
  readTime: string;
  date: string;
}

export const guidesData: Guide[] = [
  {
    id: '1',
    slug: 'how-to-choose-the-right-vehicle',
    title: 'How to Choose the Right Vehicle for Your Trip',
    description: 'A comprehensive guide on selecting the perfect vehicle based on your destination, group size, and budget in Sri Lanka.',
    category: 'Renter',
    readTime: '4 min read',
    date: 'August 15, 2026',
    content: `
      <h2>1. Consider Your Destination</h2>
      <p>If you're heading to the central highlands like Nuwara Eliya or Ella, a vehicle with higher ground clearance and a powerful engine, such as an SUV or a 4WD, is highly recommended. For city driving in Colombo, a compact car is ideal for navigating traffic and finding parking.</p>
      
      <h2>2. Factor in Your Group Size and Luggage</h2>
      <p>Don't just count the number of passengers; consider the luggage too. A 5-seater sedan might fit 5 people, but it won't fit 5 large suitcases. If you have a large group, consider renting a passenger van.</p>

      <h2>3. Fuel Efficiency</h2>
      <p>Fuel costs can add up on long trips. Hybrid vehicles are excellent for city and highway driving, while diesel engines might be more economical for long-distance travel across the island.</p>

      <h2>4. Review the Owner's Terms</h2>
      <p>Before booking, carefully read the owner's terms regarding mileage limits, fuel policies, and specific driving restrictions.</p>
    `
  },
  {
    id: '2',
    slug: 'tips-for-first-time-renters',
    title: 'Tips for First-Time Renters',
    description: 'Everything you need to know before you rent a vehicle through Rentify for the first time.',
    category: 'Renter',
    readTime: '3 min read',
    date: 'August 12, 2026',
    content: `
      <h2>1. Inspect the Vehicle Before Driving</h2>
      <p>Always do a walk-around inspection with the owner before you take the keys. Take photos or a video of any existing scratches or dents to avoid disputes later.</p>
      
      <h2>2. Check the Documents</h2>
      <p>Ensure the vehicle has a valid revenue license and insurance card. It is your right to ask the owner to see these documents.</p>

      <h2>3. Communication is Key</h2>
      <p>Communicate your pickup and drop-off times clearly. If you're running late, inform the owner immediately.</p>

      <h2>4. Emergency Preparedness</h2>
      <p>Ask the owner what to do in case of a breakdown or accident. Have their direct contact number saved on your phone.</p>
    `
  },
  {
    id: '3',
    slug: 'maximizing-your-earnings-as-an-owner',
    title: 'Maximizing Your Earnings as a Vehicle Owner',
    description: 'Learn the best practices to attract more renters, get great reviews, and maximize your rental income.',
    category: 'Owner',
    readTime: '5 min read',
    date: 'August 10, 2026',
    content: `
      <h2>1. High-Quality Photos are Crucial</h2>
      <p>Listings with clear, bright, and multiple photos get significantly more bookings. Take photos of the exterior from all angles, and clean the interior before snapping pictures of the dashboard and seats.</p>
      
      <h2>2. Competitive Pricing</h2>
      <p>Research what similar vehicles are renting for in your district. Offer competitive rates, especially when you are just starting and need to build up good reviews.</p>

      <h2>3. Write a Detailed Description</h2>
      <p>Highlight the best features of your car (e.g., Apple CarPlay, excellent AC, hybrid fuel economy). Also, be transparent about any quirks.</p>

      <h2>4. Responsive Communication</h2>
      <p>Reply to booking requests and messages promptly. Renters often reach out to multiple owners, and the first to respond usually gets the booking.</p>

      <h2>5. Keep the Vehicle Maintained</h2>
      <p>A clean, well-maintained vehicle leads to happy renters and positive word-of-mouth. Regularly check fluids, tire pressure, and brakes.</p>
    `
  }
];
