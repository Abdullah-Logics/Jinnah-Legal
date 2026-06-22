import { createApp } from './app.js';
import { closeAdapter } from './db/adapter.js';

const PORT = process.env.PORT || 3001;

async function main() {
  const app = await createApp();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' 🏛️  Jinnah Legal Backend');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(` ✅  Server   → http://localhost:${PORT}`);
    console.log(` ✅  Health   → http://localhost:${PORT}/api/health`);
    console.log(` 🗄️  DB       → ${process.env.MSSQL_SERVER ? 'MSSQL: ' + process.env.MSSQL_SERVER : 'SQLite (local file)'}`);
    console.log(` 🤖  AI       → ${process.env.GEMINI_API_KEY ? 'Gemini ' + (process.env.GEMINI_MODEL || 'gemini-2.5-flash') : 'Mock (add GEMINI_API_KEY for real AI)'}`);
    console.log(` 🌐  Mode     → ${process.env.NODE_ENV || 'development'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });

  function shutdown(signal) {
    console.log(`\n📡 Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('✅ HTTP server closed');
      await closeAdapter();
      process.exit(0);
    });
    setTimeout(() => {
      console.error('⚠️ Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    console.error(err.stack);
    shutdown('UNCAUGHT_EXCEPTION');
  });
}

main().catch(err => {
  console.error('\n❌ Startup failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
