const {
  clearOrganicEngagementErrors,
  getOrganicEngagementStatus,
  runOrganicEngagementOnce,
  startOrganicEngagementService,
  stopOrganicEngagementService,
} = require("../../services/organicEngagementService");

function getEngagementOverview(_req, res) {
  res.json({ success: true, data: getOrganicEngagementStatus() });
}

async function startEngagement(_req, res) {
  await startOrganicEngagementService({ clearAdminStop: true });
  res.json({ success: true, data: getOrganicEngagementStatus() });
}

async function stopEngagement(_req, res) {
  await stopOrganicEngagementService({ persist: true });
  res.json({ success: true, data: getOrganicEngagementStatus() });
}

async function triggerEngagementRun(_req, res) {
  try {
    const result = await runOrganicEngagementOnce();
    res.json({ success: true, data: { status: getOrganicEngagementStatus(), result } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

function resetEngagementErrors(_req, res) {
  clearOrganicEngagementErrors();
  res.json({ success: true, data: getOrganicEngagementStatus() });
}

module.exports = {
  getEngagementOverview,
  resetEngagementErrors,
  startEngagement,
  stopEngagement,
  triggerEngagementRun,
};
