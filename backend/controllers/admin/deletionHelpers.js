const prisma = require("../../prisma");

async function deletePostWithRelations(tx, postId) {
  if (!postId) return;

  await tx.adminReport.deleteMany({ where: { postId } });
  await tx.share.deleteMany({ where: { postId } });
  await tx.postView.deleteMany({ where: { postId } });
  await tx.media.deleteMany({ where: { postId } });
  await tx.pollOption.deleteMany({ where: { postId } });
  await tx.post.updateMany({
    where: { parentId: postId },
    data: { parentId: null },
  });
  await tx.post.delete({ where: { id: postId } });
}

async function deleteArticleWithRelations(tx, articleId) {
  if (!articleId) return;

  await tx.postView.deleteMany({ where: { articleId } });
  await tx.media.deleteMany({ where: { articleId } });
  await tx.article.delete({ where: { id: articleId } });
}

async function deleteEventWithRelations(tx, eventId) {
  if (!eventId) return;

  await tx.eventParticipation.deleteMany({ where: { eventId } });
  await tx.event.delete({ where: { id: eventId } });
}

async function deleteCommunityWithRelations(tx, communityId) {
  if (!communityId) return;

  const posts = await tx.post.findMany({
    where: { communityId },
    select: { id: true },
  });

  for (const post of posts) {
    await deletePostWithRelations(tx, post.id);
  }

  const events = await tx.event.findMany({
    where: { communityId },
    select: { id: true },
  });

  for (const event of events) {
    await deleteEventWithRelations(tx, event.id);
  }

  await tx.adminReport.deleteMany({ where: { communityId } });
  await tx.communityRequest.deleteMany({ where: { communityId } });
  await tx.communityMember.deleteMany({ where: { communityId } });
  await tx.community.delete({ where: { id: communityId } });
}

async function deleteUserWithRelations(userId) {
  if (!userId) return;

  await prisma.$transaction(async (tx) => {
    const createdCommunities = await tx.community.findMany({
      where: { creatorId: userId },
      select: { id: true },
    });

    for (const community of createdCommunities) {
      await deleteCommunityWithRelations(tx, community.id);
    }

    const createdEvents = await tx.event.findMany({
      where: { creatorId: userId },
      select: { id: true },
    });

    for (const event of createdEvents) {
      await deleteEventWithRelations(tx, event.id);
    }

    const posts = await tx.post.findMany({
      where: { authorId: userId },
      select: { id: true },
    });

    for (const post of posts) {
      await deletePostWithRelations(tx, post.id);
    }

    const articles = await tx.article.findMany({
      where: { authorId: userId },
      select: { id: true },
    });

    for (const article of articles) {
      await deleteArticleWithRelations(tx, article.id);
    }

    await tx.adminReport.deleteMany({
      where: {
        OR: [{ reporterId: userId }, { profileId: userId }],
      },
    });
    await tx.communityMember.deleteMany({ where: { userId } });
    await tx.communityRequest.deleteMany({ where: { userId } });
    await tx.follows.deleteMany({
      where: {
        OR: [{ followerId: userId }, { followingId: userId }],
      },
    });
    await tx.block.deleteMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    await tx.message.deleteMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.donation.deleteMany({ where: { userId } });
    await tx.eventParticipation.deleteMany({ where: { userId } });
    await tx.supportMessage.deleteMany({ where: { userId } });
    await tx.articleApplication.deleteMany({ where: { userId } });
    await tx.media.deleteMany({ where: { uploaderId: userId } });
    await tx.postView.deleteMany({ where: { userId } });
    await tx.comment.deleteMany({ where: { authorId: userId } });
    await tx.like.deleteMany({ where: { userId } });
    await tx.save.deleteMany({ where: { userId } });
    await tx.flag.deleteMany({ where: { userId } });
    await tx.share.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });
}

module.exports = {
  deletePostWithRelations,
  deleteCommunityWithRelations,
  deleteUserWithRelations,
};
