/**
 * server.js — HTTP server entry point
 * Run: node server/server.js  OR  npm run dev
 */
const app  = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🍽️  College Hostel Food Waste Tracker`);
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
  console.log(`📊 Dashboard:        http://localhost:${PORT}/dashboard.html`);
  console.log(`\nPress Ctrl+C to stop.\n`);
});
