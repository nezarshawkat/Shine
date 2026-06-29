function partitionUsers(users) {
  const sorted = [...users];
  const active = sorted.slice(0, 40);
  const working = sorted.slice(0, 30);
  const articleContributors = sorted.slice(0, 10);
  return { active, working, articleContributors };
}

function pickPostType() {
  const roll = Math.random();
  if (roll < 0.5) return 'opinion';
  if (roll < 0.8) return 'critique';
  if (roll < 0.9) return 'analysis';
  return 'poll';
}

module.exports = { partitionUsers, pickPostType };
