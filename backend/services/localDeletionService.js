function deletePost(db, postId) {
  if (!postId) return;
  const commentIds = db.prepare("SELECT id FROM Comment WHERE postId = ?").all(postId).map((row) => row.id);
  const transaction = db.transaction(() => {
    for (const commentId of commentIds) {
      db.prepare("DELETE FROM LikeRecord WHERE commentId = ?").run(commentId);
    }
    db.prepare("DELETE FROM LikeRecord WHERE postId = ?").run(postId);
    db.prepare("DELETE FROM SaveRecord WHERE postId = ?").run(postId);
    db.prepare("DELETE FROM ShareRecord WHERE postId = ?").run(postId);
    db.prepare("DELETE FROM PostView WHERE postId = ?").run(postId);
    db.prepare("DELETE FROM Media WHERE postId = ?").run(postId);
    db.prepare("DELETE FROM Source WHERE postId = ?").run(postId);
    db.prepare("DELETE FROM PollVote WHERE postId = ?").run(postId);
    db.prepare("DELETE FROM PollOption WHERE postId = ?").run(postId);
    db.prepare("DELETE FROM Comment WHERE postId = ?").run(postId);
    db.prepare("UPDATE Post SET parentId = NULL WHERE parentId = ?").run(postId);
    db.prepare("DELETE FROM Post WHERE id = ?").run(postId);
  });
  transaction();
}

function deleteArticle(db, articleId) {
  if (!articleId) return;
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM LikeRecord WHERE articleId = ?").run(articleId);
    db.prepare("DELETE FROM SaveRecord WHERE articleId = ?").run(articleId);
    db.prepare("DELETE FROM PostView WHERE articleId = ?").run(articleId);
    db.prepare("DELETE FROM Media WHERE articleId = ?").run(articleId);
    db.prepare("DELETE FROM Source WHERE articleId = ?").run(articleId);
    db.prepare("DELETE FROM Article WHERE id = ?").run(articleId);
  });
  transaction();
}

function deleteEvent(db, eventId) {
  if (!eventId) return;
  db.prepare("DELETE FROM EventParticipation WHERE eventId = ?").run(eventId);
  db.prepare("DELETE FROM Event WHERE id = ?").run(eventId);
}

function deleteCommunity(db, communityId) {
  if (!communityId) return false;
  const exists = Boolean(db.prepare("SELECT id FROM Community WHERE id = ?").get(communityId));
  if (!exists) return false;

  const postIds = db.prepare("SELECT id FROM Post WHERE communityId = ?").all(communityId).map((row) => row.id);
  for (const postId of postIds) deletePost(db, postId);

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM CommunityRequest WHERE communityId = ?").run(communityId);
    db.prepare("DELETE FROM CommunityMember WHERE communityId = ?").run(communityId);
    db.prepare("DELETE FROM Community WHERE id = ?").run(communityId);
  });
  transaction();
  return true;
}

function deleteUser(db, userId) {
  if (!userId) return false;
  const exists = Boolean(db.prepare("SELECT id FROM User WHERE id = ?").get(userId));
  if (!exists) return false;

  const communityIds = db.prepare("SELECT id FROM Community WHERE creatorId = ?").all(userId).map((row) => row.id);
  for (const communityId of communityIds) deleteCommunity(db, communityId);

  const postIds = db.prepare("SELECT id FROM Post WHERE authorId = ?").all(userId).map((row) => row.id);
  for (const postId of postIds) deletePost(db, postId);

  const articleIds = db.prepare("SELECT id FROM Article WHERE authorId = ?").all(userId).map((row) => row.id);
  for (const articleId of articleIds) deleteArticle(db, articleId);

  const eventIds = db.prepare("SELECT id FROM Event WHERE creatorId = ?").all(userId).map((row) => row.id);
  for (const eventId of eventIds) deleteEvent(db, eventId);

  const commentIds = db.prepare("SELECT id FROM Comment WHERE authorId = ?").all(userId).map((row) => row.id);
  const transaction = db.transaction(() => {
    for (const commentId of commentIds) {
      db.prepare("DELETE FROM LikeRecord WHERE commentId = ?").run(commentId);
    }
    db.prepare("DELETE FROM Comment WHERE authorId = ?").run(userId);
    db.prepare("DELETE FROM LikeRecord WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM SaveRecord WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM ShareRecord WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM PollVote WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM PostView WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM EventParticipation WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM CommunityRequest WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM CommunityMember WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM Notification WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM Message WHERE senderId = ? OR receiverId = ?").run(userId, userId);
    db.prepare("DELETE FROM Media WHERE uploaderId = ?").run(userId);
    db.prepare("DELETE FROM User WHERE id = ?").run(userId);
  });
  transaction();
  return true;
}

module.exports = { deleteArticle, deleteCommunity, deleteEvent, deletePost, deleteUser };
