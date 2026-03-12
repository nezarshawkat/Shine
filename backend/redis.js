const { createClient } = require("redis");

let redisClient;

if (process.env.ENABLE_REDIS === "true") {
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    // ADD THIS SECTION:
    socket: {
      connectTimeout: 5000, // Stop trying after 5 seconds
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.error("❌ Redis: Max retries reached. Stopping attempts.");
          return new Error("Redis connection failed"); 
        }
        return 1000; // Retry every 1 second
      }
    }
  });

  redisClient.on("error", (err) => {
    // This logs the error but doesn't kill the server
    console.error("⚠️ Redis Client Error:", err.message);
  });

  redisClient.connect().catch((err) => {
    console.error("🚫 Initial Redis connection failed. App will continue without cache.");
  });
} else {
  // Your dummy client is good, but let's add common missing methods to avoid 'not a function' errors
  redisClient = {
    get: async () => null,
    set: async () => "OK",
    setEx: async () => "OK",
    del: async () => 0,
    zAdd: async () => 0,
    zRevRange: async () => [],
    isOpen: false,
    on: () => {},
    connect: async () => {},
    quit: async () => {},
  };
}

module.exports = redisClient;