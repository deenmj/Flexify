import http from 'http';

http.get('http://localhost:5000/api/vehicles', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(`Found ${parsed.vehicles?.length || 0} vehicles.`);
      if (parsed.vehicles?.length > 0) {
        console.log("First vehicle title:", parsed.vehicles[0].title);
      }
    } catch(e) {
      console.log(data);
    }
  });
}).on('error', err => {
  console.log("Backend not running or error: ", err.message);
});
