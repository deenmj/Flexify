export default async function handler(req, res) {
  const { slug } = req.query;
  
  if (!slug) {
    return res.status(400).send('Missing slug');
  }

  // 1. Fetch the raw index.html from the deployment root
  // We use the host header to dynamically get the current environment's domain (e.g. rentify.lk or a preview url)
  const host = req.headers.host || 'rentify.lk';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  try {
    // 2. Fetch vehicle data from backend
    // Extract ID from slug (e.g. toyota-corolla--65b12c8 -> 65b12c8)
    const id = slug.includes('--') ? slug.split('--').pop() : slug;
    
    // Fallback to production backend URL if env is missing
    const backendUrl = process.env.VITE_API_URL || 'https://api.rentify.lk/api';
    
    const [htmlResponse, vehicleResponse] = await Promise.all([
      fetch(`${baseUrl}/`),
      fetch(`${backendUrl}/vehicles/${id}`)
    ]);

    if (!htmlResponse.ok) {
      throw new Error('Failed to fetch base HTML');
    }

    let html = await htmlResponse.text();

    if (vehicleResponse.ok) {
      const vehicle = await vehicleResponse.json();
      
      // Construct dynamic data
      const title = `${vehicle.make} ${vehicle.model} ${vehicle.year ? `(${vehicle.year}) ` : ''}| Rentify`;
      const description = `${vehicle.transmission} | ${vehicle.fuelType} | ${vehicle.city || vehicle.district}. Rent from LKR ${vehicle.pricePerDay}/day.`;
      const url = `${baseUrl}/vehicles/${slug}`;
      
      // Ensure image is absolute
      let imageUrl = 'https://rentify.lk/og-image.png'; // Default fallback
      if (vehicle.photos && vehicle.photos.length > 0) {
        const photo = vehicle.photos[0];
        const rawUrl = typeof photo === 'object' ? photo.url : photo;
        if (rawUrl && typeof rawUrl === 'string') {
          // If it's a relative local path, prepend the backend URL (since uploads live on the backend)
          if (rawUrl.startsWith('/')) {
            imageUrl = `https://api.rentify.lk${rawUrl}`;
          } else {
            imageUrl = rawUrl; // Cloudinary or other absolute URL
          }
        }
      }

      // 3. Inject meta tags into the <head>
      const metaTags = `
        <!-- Dynamic Server-Injected Social Tags -->
        <meta property="og:type" content="product" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:url" content="${url}" />
        <meta property="og:image" content="${imageUrl}" />
        
        <!-- Dynamic Twitter Tags -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${imageUrl}" />
      `;

      // Insert right before </head>
      html = html.replace('</head>', `${metaTags}</head>`);
      
      // Also replace the static <title> and description if they exist in the raw HTML
      html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${description}" />`);
    }

    // 4. Return the modified HTML
    res.setHeader('Content-Type', 'text/html');
    // Cache at the edge for 60 seconds to improve performance
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); 
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error generating OG tags:', error);
    // Fallback: If anything fails, return the base HTML so the React app still loads for real users
    try {
      const fallbackHtml = await (await fetch(`${baseUrl}/`)).text();
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(fallbackHtml);
    } catch (e) {
      return res.status(500).send('Internal Server Error');
    }
  }
}
