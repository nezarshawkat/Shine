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
  try {
    const started = await startOrganicEngagementService({ clearAdminStop: true });
    res.json({ success: true, started, data: getOrganicEngagementStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: `Failed to start engagement: ${error.message}` });
  }
}

async function stopEngagement(_req, res) {
  try {
    await stopOrganicEngagementService({ persist: true });
    res.json({ success: true, data: getOrganicEngagementStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: `Failed to stop engagement: ${error.message}` });
  }
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
