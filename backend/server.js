import 'dotenv/config';
import app from './app.js';
import { connectDB, getDbStatus } from './config/db.js';
import { isImageKitConfigured } from './config/imagekit.config.js';
import { PORT } from './config/constants.js';

const startServer = async () => {
  console.log('🚀 [RentBuddy Backend] Initializing ERP & Logistics Server...');
  
  // Connect to MongoDB Atlas and auto-seed admin if needed
  await connectDB();

  const isMongo = getDbStatus();
  const isIK = isImageKitConfigured();

  // Start HTTP Server
  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`✅ RentBuddy Backend running on port: ${PORT}`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api/v1`);
    console.log(`🍃 MongoDB Status: ${isMongo ? 'Connected (Atlas)' : 'Disconnected (Offline Mode)'}`);
    console.log(`🖼️  ImageKit Status: ${isIK ? 'Connected' : 'Disconnected (Not Configured)'}`);
    console.log(`======================================================\n`);
  });

  // Graceful shutdown handling
  const handleShutdown = (signal) => {
    console.log(`\nReceived ${signal}. Shutting down RentBuddy server gracefully...`);
    server.close(() => {
      console.log('Server closed successfully.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
};

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
