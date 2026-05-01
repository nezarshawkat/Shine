const express = require('express');
const router = express.Router();
const { startAutoActivitySystem, stopAutoActivitySystem, getAutoActivityStatus } = require('../autoActivitySystem');

router.get('/status', (req, res) => res.json(getAutoActivityStatus()));
router.post('/start', (req, res) => { startAutoActivitySystem(); res.json({ ok: true, status: getAutoActivityStatus() }); });
router.post('/stop', (req, res) => { stopAutoActivitySystem(); res.json({ ok: true, status: getAutoActivityStatus() }); });

module.exports = router;
