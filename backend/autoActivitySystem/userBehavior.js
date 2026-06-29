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

function pickPostLength(postType) {
  if (postType === 'poll') return { label: 'concise', minWords: 15, maxWords: 55 };

  const roll = Math.random();
  if (roll < 0.3) return { label: 'short', minWords: 25, maxWords: 70 };
  if (roll < 0.8) return { label: 'medium', minWords: 70, maxWords: 160 };
  return { label: 'long', minWords: 160, maxWords: 280 };
}

module.exports = { partitionUsers, pickPostLength, pickPostType };
