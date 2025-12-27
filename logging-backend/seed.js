
const axios = require('axios');

async function seed() {
  const tokenRes = await axios.post('http://localhost:3000/auth/token');
  const token = tokenRes.data.token;

  for (let i = 0; i < 20; i++) {
    try {
      await axios.post('http://localhost:3000/logs',
        { message: `seed-log-${i}` },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Seed error', err.response?.status);
    }
  }
  console.log('Seeding completed');
}

seed();
