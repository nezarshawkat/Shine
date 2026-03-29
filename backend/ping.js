const express = require("express");

const pingRouter = express.Router();
let pingInterval = null;

// Uptime monitor endpoint for services like UptimeRobot to verify backend availability.
pingRouter.get("/ping", (req, res) => {
  res.json({
    status: "ok",
    service: "shine-backend",
    timestamp: new Date().toISOString(),
  });
});

// Background interval to keep the backend active with a lightweight periodic task.
function startPing() {
  if (pingInterval) {
    return pingInterval;
  }

  pingInterval = setInterval(() => {
    console.log(`[${new Date().toISOString()}] ping task executed`);
  }, 30_000);

  return pingInterval;
}

module.exports = {
  pingRouter,
  startPing,
};
