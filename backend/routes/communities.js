const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const dataService = require("../services/dataService");
const localCommunities = require("../services/localCommunityService");
const { memoryUpload, uploadBufferToSupabase } = require("../lib/supabaseStorage");
const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

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
    if (localOnly) {
      localCommunities.deleteCommunity(req.params.id);
      return res.json({ message: "Community deleted" });
    }

    await prisma.$transaction([
      prisma.communityMember.deleteMany({ where: { communityId: req.params.id } }),
      prisma.communityRequest.deleteMany({ where: { communityId: req.params.id } }),
      prisma.community.delete({ where: { id: req.params.id } })
    ]);
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
    if (localOnly) {
      return res.json({ message: "Role update is not available in local-only mode yet" });
    }

    const { id, targetUserId } = req.params;
    const { role } = req.body; 

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
        })
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
    if (localOnly) return res.json({ message: "Member removed" });

    const { id, targetUserId } = req.params;
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
    if (localOnly) return res.json({ message: "Left successfully" });

    const { id } = req.params;
    const { userId } = req.body;
    await prisma.communityMember.delete({
      where: { userId_communityId: { userId, communityId: id } },
    });
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
    if (localOnly) return res.json({ message: "Request updated" });

    const { id, requestId } = req.params;
    const { action } = req.body;

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
    if (localOnly) return res.json([]);

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
