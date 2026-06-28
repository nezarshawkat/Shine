const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const prisma = require("../prisma");
const dataService = require("../services/dataService");
const localCommunities = require("../services/localCommunityService");
const { memoryUpload, uploadBufferToSupabase } = require("../lib/supabaseStorage");
const { deleteCommunityWithRelations } = require("../controllers/admin/deletionHelpers");
const JWT_SECRET = process.env.JWT_SECRET || "shine-super-secret-key";
const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

function getRequesterId(req) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
}

async function getCommunityRole(communityId, userId) {
  if (!userId) return null;
  if (localOnly) return localCommunities.membership(communityId, userId).role || null;
  const member = await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId, communityId } },
    select: { role: true },
  });
  return member?.role || null;
}

async function requireCommunityRole(req, res, roles) {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const role = await getCommunityRole(req.params.id, requesterId);
  if (!roles.includes(role)) {
    res.status(403).json({ error: "You do not have permission to manage this community" });
    return null;
  }
  return { requesterId, role };
}

// ================== GENERAL ROUTES ==================

/**
 * GET All Communities
 */
router.get("/", async (req, res) => {
  try {
    if (localOnly) return res.json(localCommunities.listCommunities());

    const communities = await prisma.community.findMany({
      include: {
        _count: { select: { communityMembers: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(communities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch communities" });
  }
});

/**
 * GET Community By ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (localOnly) {
      const community = localCommunities.getCommunity(id);
      if (!community) return res.status(404).json({ message: "Community not found" });
      return res.json(community);
    }

    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        _count: { 
          select: { 
            communityMembers: true, 
            requests: true 
          } 
        },
        communityMembers: {
          include: { user: { select: { id: true, username: true, image: true } } }
        }
      },
    });

    if (!community) return res.status(404).json({ message: "Community not found" });
    res.json(community);
  } catch (err) {
    console.error("Fetch Community Error:", err);
    res.status(500).json({ error: "Failed to fetch community" });
  }
});

/**
 * CREATE Community
 */
router.post(
  "/",
  memoryUpload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { name, slogan, discription, privacy, adminId, interests } = req.body;

      if (!adminId) {
        return res.status(400).json({ message: "adminId is required" });
      }

      // PARSE INTERESTS: Parse the JSON string from FormData into a real array
      let interestsArray = [];
      if (interests) {
        try {
          interestsArray = JSON.parse(interests);
        } catch (e) {
          // Fallback if it's sent as a plain comma-separated string
          interestsArray = typeof interests === "string" ? interests.split(",") : [];
        }
      }

      const iconUpload = req.files?.["icon"]?.[0] ? await uploadBufferToSupabase(req.files["icon"][0], "community") : null;
      const bannerUpload = req.files?.["banner"]?.[0] ? await uploadBufferToSupabase(req.files["banner"][0], "community") : null;
      const iconPath = iconUpload?.url || null;
      const bannerPath = bannerUpload?.url || null;

      if (localOnly) {
        const newCommunity = localCommunities.createCommunity({
          name,
          slogan,
          discription,
          interests: interestsArray,
          icon: iconPath,
          banner: bannerPath,
          status: privacy?.toUpperCase() === "PRIVATE" ? "PRIVATE" : "PUBLIC",
          creatorId: adminId,
        });
        return res.status(201).json(newCommunity);
      }

      const newCommunity = await prisma.community.create({
        data: {
          name,
          slogan,
          discription, // Matches the spelling in your Prisma schema
          interests: interestsArray, 
          icon: iconPath,
          banner: bannerPath,
          status: privacy?.toUpperCase() === "PRIVATE" ? "PRIVATE" : "PUBLIC",
          creatorId: adminId,
          communityMembers: {
            create: [{ userId: adminId, role: "MAIN_ADMIN" }],
          },
        },
      });

      res.status(201).json(newCommunity);
    } catch (err) {
      console.error("Prisma Creation Error:", err);
      res.status(500).json({ error: "Failed to create community", details: err.message });
    }
  }
);
/**
 * UPDATE Community General Settings
 */
router.put("/:id", memoryUpload.fields([{ name: "icon", maxCount: 1 }, { name: "banner", maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!await requireCommunityRole(req, res, ["MAIN_ADMIN"])) return;
    const { name, slogan, discription, status } = req.body;

    const updateData = { name, slogan, discription, status };
    if (req.files?.["icon"]?.[0]) {
      const { url } = await uploadBufferToSupabase(req.files["icon"][0], "community");
      updateData.icon = url;
    }
    if (req.files?.["banner"]?.[0]) {
      const { url } = await uploadBufferToSupabase(req.files["banner"][0], "community");
      updateData.banner = url;
    }

    if (localOnly) {
      const updated = localCommunities.updateCommunity(id, updateData);
      if (!updated) return res.status(404).json({ error: "Community not found" });
      return res.json(updated);
    }

    const updated = await prisma.community.update({
      where: { id },
      data: updateData
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

/**
 * DELETE Community
 */
router.delete("/:id", async (req, res) => {
  try {
    if (!await requireCommunityRole(req, res, ["MAIN_ADMIN"])) return;
    if (localOnly) {
      if (!localCommunities.deleteCommunity(req.params.id)) return res.status(404).json({ error: "Community not found" });
      return res.json({ message: "Community deleted" });
    }

    await prisma.$transaction((tx) => deleteCommunityWithRelations(tx, req.params.id));
    res.json({ message: "Community deleted" });
  } catch (err) {
    res.status(500).json({ error: "Deletion failed" });
  }
});

// ================== MEMBERS & ROLES ==================

/**
 * MANAGE MEMBERS (Promote/Demote/Transfer Main Admin)
 * Fixed to match frontend route: /:id/members/:targetUserId/role
 */
router.put("/:id/members/:targetUserId/role", async (req, res) => {
  try {
    if (!await requireCommunityRole(req, res, ["MAIN_ADMIN"])) return;
    const { id, targetUserId } = req.params;
    const { role } = req.body;
    if (localOnly) {
      const updated = localCommunities.updateMemberRole(id, targetUserId, role);
      if (!updated) return res.status(404).json({ error: "Community member not found" });
      return res.json(updated);
    }

    if (role === "MAIN_ADMIN") {
      // Transaction to ensure one owner: demote current, promote target
      await prisma.$transaction([
        prisma.communityMember.updateMany({
          where: { communityId: id, role: "MAIN_ADMIN" },
          data: { role: "ADMIN" } 
        }),
        prisma.communityMember.update({
          where: { userId_communityId: { userId: targetUserId, communityId: id } },
          data: { role: "MAIN_ADMIN" }
        }),
        prisma.community.update({ where: { id }, data: { creatorId: targetUserId } }),
      ]);
      return res.json({ message: "Ownership transferred successfully" });
    }

    const updated = await prisma.communityMember.update({
      where: { userId_communityId: { userId: targetUserId, communityId: id } },
      data: { role }
    });
    res.json(updated);
  } catch (err) {
    console.error("Role Update Error:", err);
    res.status(500).json({ error: "Role update failed" });
  }
});

/**
 * KICK MEMBER
 */
router.delete("/:id/members/:targetUserId", async (req, res) => {
  try {
    const { id, targetUserId } = req.params;
    const manager = await requireCommunityRole(req, res, ["MAIN_ADMIN", "ADMIN"]);
    if (!manager) return;
    const targetRole = await getCommunityRole(id, targetUserId);
    if (targetRole === "MAIN_ADMIN" || (manager.role === "ADMIN" && targetRole === "ADMIN")) {
      return res.status(403).json({ error: "You cannot remove this community manager" });
    }
    if (localOnly) {
      const removed = localCommunities.removeMember(id, targetUserId);
      if (!removed) return res.status(404).json({ error: "Community member not found" });
      return res.json({ message: "Member removed" });
    }

    await prisma.communityMember.delete({
      where: { userId_communityId: { userId: targetUserId, communityId: id } }
    });
    res.json({ message: "Member removed" });
  } catch (err) {
    res.status(500).json({ error: "Removal failed" });
  }
});

/**
 * LEAVE Community
 */
router.post("/:id/leave", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const requesterId = getRequesterId(req);
    if (!requesterId || requesterId !== userId) return res.status(403).json({ error: "You can only leave for your own account" });
    const role = await getCommunityRole(id, userId);
    if (role === "MAIN_ADMIN") return res.status(409).json({ error: "Transfer ownership or delete the community before leaving" });
    if (localOnly) {
      const removed = localCommunities.leaveCommunity(id, userId);
      if (!removed) return res.status(404).json({ error: "You are not a member of this community" });
      return res.json({ message: "Left successfully" });
    }

    await prisma.communityMember.deleteMany({ where: { userId, communityId: id } });
    await prisma.communityRequest.deleteMany({ where: { userId, communityId: id } });
    res.json({ message: "Left successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to leave" });
  }
});

// ================== JOIN REQUESTS ==================

/**
 * JOIN / REQUEST TO JOIN
 */
router.post("/:id/join", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (localOnly) {
      const result = localCommunities.joinCommunity(id, userId);
      if (!result) return res.status(404).json({ message: "Community not found" });
      return res.json(result);
    }

    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) return res.status(404).json({ message: "Community not found" });

    const existingMember = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId: id } }
    });
    if (existingMember) return res.status(400).json({ message: "Already a member" });

    if (community.status === "PRIVATE") {
      await prisma.communityRequest.upsert({
        where: { userId_communityId: { userId, communityId: id } },
        update: { status: "PENDING" },
        create: { userId, communityId: id, status: "PENDING" }
      });
      return res.json({ message: "Join request sent", status: "PENDING" });
    }

    const newMember = await prisma.communityMember.create({
      data: { userId, communityId: id, role: "MEMBER" },
    });

    res.json({ message: "Joined successfully", status: "MEMBER", member: newMember });
  } catch (err) {
    res.status(500).json({ error: "Join error" });
  }
});

/**
 * MANAGE REQUESTS (Accept/Decline)
 */
router.post("/:id/requests/:requestId", async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { action } = req.body;
    if (!await requireCommunityRole(req, res, ["MAIN_ADMIN", "ADMIN"])) return;
    if (!["ACCEPT", "DECLINE"].includes(action)) return res.status(400).json({ error: "Invalid request action" });
    if (localOnly) {
      const result = localCommunities.resolveRequest(id, requestId, action);
      if (!result) return res.status(404).json({ message: "Request not found" });
      return res.json(result);
    }

    const joinReq = await prisma.communityRequest.findUnique({ where: { id: requestId } });
    if (!joinReq) return res.status(404).json({ message: "Request not found" });

    if (action === "ACCEPT") {
      await prisma.$transaction([
        prisma.communityMember.create({
          data: { userId: joinReq.userId, communityId: id, role: "MEMBER" }
        }),
        prisma.communityRequest.delete({ where: { id: requestId } })
      ]);
      return res.json({ message: "Accepted" });
    } else {
      await prisma.communityRequest.delete({ where: { id: requestId } });
      return res.json({ message: "Declined" });
    }
  } catch (err) {
    res.status(500).json({ error: "Request management error" });
  }
});

/**
 * GET PENDING REQUESTS
 */
router.get("/:id/requests", async (req, res) => {
  try {
    if (!await requireCommunityRole(req, res, ["MAIN_ADMIN", "ADMIN"])) return;
    if (localOnly) return res.json(localCommunities.listRequests(req.params.id));

    const requests = await prisma.communityRequest.findMany({
      where: { communityId: req.params.id, status: "PENDING" },
      include: { user: { select: { id: true, username: true, image: true, name: true } } }
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Fetch error" });
  }
});

// ================== MEMBERSHIP CHECK ==================

router.get("/:id/membership/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;
    if (localOnly) return res.json(localCommunities.membership(id, userId));

    const member = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId: id } }
    });

    if (member) return res.json({ isMember: true, role: member.role, status: "ACCEPTED" });

    const request = await prisma.communityRequest.findUnique({
      where: { userId_communityId: { userId, communityId: id } }
    });

    if (request) return res.json({ isMember: false, status: request.status });
    res.json({ isMember: false, status: "NONE" });
  } catch (err) {
    res.status(500).json({ error: "Membership check failed" });
  }
});

// ================== POSTS ==================

router.get("/:id/posts", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await dataService.getCommunityPosts({ id, userId, page, limit });
    if (!result) return res.status(404).json({ error: "Community not found" });
    res.json(result);
  } catch (err) {
    console.error("Fetch community posts error:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});


module.exports = router;
