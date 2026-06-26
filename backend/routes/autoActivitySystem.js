const express = require('express');
const router = express.Router();
const { startAutoActivitySystem, stopAutoActivitySystem, getAutoActivityStatus } = require('../autoActivitySystem');

const localOnly =
  process.env.DATABASE_MODE === 'local' ||
  process.env.LOCAL_ONLY_DB === 'true' ||
  !process.env.DATABASE_URL;

router.get('/status', (req, res) => res.json(getAutoActivityStatus()));
router.post('/start', (req, res) => {
  if (localOnly) {
    return res.status(409).json({
      ok: false,
      message: 'Auto activity is disabled in local SQLite mode.',
      status: getAutoActivityStatus(),
    });
  }

  startAutoActivitySystem();
  return res.json({ ok: true, status: getAutoActivityStatus() });
});
router.post('/stop', (req, res) => { stopAutoActivitySystem(); res.json({ ok: true, status: getAutoActivityStatus() }); });

module.exports = router;
