const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isSyntheticUser,
  rankUnseenFirst,
  rerankCandidates,
  scoreCandidate,
} = require("../services/feedRankingService");

const emptyMetrics = {
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  views: 0,
  impressions: 0,
  opens: 0,
  averageDwellMs: 0,
};

function profile(overrides = {}) {
  return {
    userId: "viewer",
    followingIds: new Set(),
    topicWeights: new Map(),
    creatorWeights: new Map(),
    typeWeights: new Map(),
    priorInteractions: new Map(),
    engagedPostIds: new Set(),
    ...overrides,
  };
}

function post(id, authorId, keyword = "politics") {
  return {
    id,
    authorId,
    type: "opinion",
    text: "A sourced political opinion with enough detail to read.",
    keywords: [keyword],
    sourceCount: 1,
    createdAt: new Date(),
    featured: false,
  };
}

test("recognizes all synthetic engagement account forms", () => {
  assert.equal(isSyntheticUser({ provider: "seed", username: "writer" }), true);
  assert.equal(isSyntheticUser({ username: "user_454353" }), true);
  assert.equal(isSyntheticUser({ email: "person@mock.shine.local" }), true);
  assert.equal(isSyntheticUser({ provider: "google", username: "real_person" }), false);
});

test("personal affinity outranks an otherwise equal unfamiliar post", () => {
  const viewer = profile({
    followingIds: new Set(["followed"]),
    topicWeights: new Map([["politics", 8]]),
    creatorWeights: new Map([["followed", 5]]),
  });
  const followed = scoreCandidate({
    post: post("one", "followed"),
    metrics: emptyMetrics,
    profile: viewer,
    sources: new Set(["network", "interest"]),
    sessionId: "session",
  });
  const unfamiliar = scoreCandidate({
    post: post("two", "unknown", "economics"),
    metrics: emptyMetrics,
    profile: viewer,
    sources: new Set(["recent"]),
    sessionId: "session",
  });
  assert.ok(followed.score > unfamiliar.score);
});

test("reported posts become ineligible", () => {
  const item = post("reported", "author");
  const viewer = profile({
    priorInteractions: new Map([[item.id, { reported: true, dwellMs: 0 }]]),
  });
  const result = scoreCandidate({
    post: item,
    metrics: emptyMetrics,
    profile: viewer,
    sources: new Set(["recent"]),
    sessionId: "session",
  });
  assert.ok(result.score < -5);
});

test("reranking avoids consecutive authors", () => {
  const candidates = [
    { post: post("1", "a"), score: 10, primaryTopic: "politics", exploration: false },
    { post: post("2", "a"), score: 9, primaryTopic: "politics", exploration: false },
    { post: post("3", "b"), score: 8, primaryTopic: "politics", exploration: false },
    { post: post("4", "c", "diplomacy"), score: 7, primaryTopic: "diplomacy", exploration: true },
  ];
  const ranked = rerankCandidates(candidates, 4);
  for (let index = 1; index < ranked.length; index += 1) {
    assert.notEqual(ranked[index].post.authorId, ranked[index - 1].post.authorId);
  }
});

test("all unseen posts are placed before previously engaged posts", () => {
  const candidates = [
    { post: post("engaged-high", "a"), score: 100, primaryTopic: "politics", exploration: false },
    { post: post("unseen-low", "b"), score: 1, primaryTopic: "diplomacy", exploration: false },
    { post: post("unseen-mid", "c"), score: 2, primaryTopic: "economics", exploration: false },
  ];
  const ranked = rankUnseenFirst(candidates, new Set(["engaged-high"]), "engaged-high");
  assert.deepEqual(ranked.map((item) => item.post.id), ["unseen-mid", "unseen-low", "engaged-high"]);
});
