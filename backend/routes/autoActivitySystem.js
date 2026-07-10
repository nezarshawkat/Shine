const express = require('express');
const router = express.Router();
const { startAutoActivitySystem, stopAutoActivitySystem, getAutoActivityStatus } = require('../autoActivitySystem');

router.get('/status', (req, res) => res.json(getAutoActivityStatus()));
router.post('/start', async (req, res) => {
  await startAutoActivitySystem({ clearAdminStop: true });
  return res.json({ ok: true, status: getAutoActivityStatus() });
});
router.post('/stop', async (req, res) => { await stopAutoActivitySystem({ persist: true }); res.json({ ok: true, status: getAutoActivityStatus() }); });

module.exports = router;
