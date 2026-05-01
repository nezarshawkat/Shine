function partitionUsers(users) {
  const sorted = [...users];
  const active = sorted.slice(0, 40);
  const working = sorted.slice(0, 30);
  const articleContributors = sorted.slice(0, 10);
  return { active, working, articleContributors };
}

function pickPostType() {
  const pool = ['opinion','opinion','opinion','critique','critique','analysis','poll'];
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = { partitionUsers, pickPostType };
