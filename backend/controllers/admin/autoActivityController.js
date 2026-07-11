const {
  startAutoActivitySystem,
  stopAutoActivitySystem,
  getAutoActivityStatus,
  createOnePost,
  createOneArticle,
  clearAutoActivityErrors,
} = require('../../autoActivitySystem');

function getAutoActivityOverview(req, res) {
  res.json({ success: true, data: getAutoActivityStatus() });
}

async function startAutoActivity(req, res) {
  try {
    const started = await startAutoActivitySystem({ clearAdminStop: true });
    res.json({ success: true, started, data: getAutoActivityStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: `Failed to start auto activity: ${error.message}` });
  }
}

async function stopAutoActivity(req, res) {
  try {
    await stopAutoActivitySystem({ persist: true });
    res.json({ success: true, data: getAutoActivityStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: `Failed to stop auto activity: ${error.message}` });
  }
}

async function triggerAutoPost(req, res) {
  try {
    const post = await createOnePost();
    res.json({ success: true, data: { id: post.id, createdAt: post.createdAt } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function triggerAutoArticle(req, res) {
  try {
    const article = await createOneArticle();
    res.json({ success: true, data: { id: article.id, createdAt: article.createdAt } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

function resetAutoActivityErrors(req, res) {
  clearAutoActivityErrors();
  res.json({ success: true, data: getAutoActivityStatus() });
}

module.exports = {
  getAutoActivityOverview,
  startAutoActivity,
  stopAutoActivity,
  triggerAutoPost,
  triggerAutoArticle,
  resetAutoActivityErrors,
};
