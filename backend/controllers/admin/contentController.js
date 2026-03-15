const prisma = require("../../prisma");
const { parsePagination, writeAuditLog } = require("./common");

const config = {
  posts: {
    model: "post",
    select: { id: true, text: true, status: true, featured: true, engagement: true, createdAt: true, author: { select: { id: true, username: true } } },
  },
  events: {
    model: "event",
    select: { id: true, title: true, description: true, status: true, featured: true, engagement: true, date: true, createdAt: true, communityId: true, creatorId: true, location: true, mode: true },
  },
  communities: {
    model: "community",
    select: { id: true, name: true, status: true, featured: true, engagement: true, creator: { select: { id: true, username: true } } },
  },
};

function getModel(key) {
  const found = config[key];
  if (!found) throw new Error("Unsupported content type");
  return found;
}

async function listContent(req, res) {
  try {
    const { type } = req.params;
    const { q } = req.query;
    const { page, pageSize } = parsePagination(req);
    const found = getModel(type);
    const model = prisma[found.model];

    const where = q
      ? type === "posts"
        ? { text: { contains: q, mode: "insensitive" } }
        : type === "events"
        ? { title: { contains: q, mode: "insensitive" } }
        : { name: { contains: q, mode: "insensitive" } }
      : {};

    const [data, total] = await Promise.all([
      model.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: found.select,
      }),
      model.count({ where }),
    ]);

    res.json({ data, pagination: { page, pageSize, total } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateContent(req, res) {
  try {
    const { type, id } = req.params;
    const { featured, status, text, title, description, name, date, communityId, location, mode, creatorId } = req.body;
    const found = getModel(type);
    const model = prisma[found.model];

    const payload = {
      ...(featured !== undefined ? { featured } : {}),
      ...(status ? { status } : {}),
      ...(text ? { text } : {}),
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(name ? { name } : {}),
      ...(date ? { date: new Date(date) } : {}),
      ...(communityId !== undefined ? { communityId: communityId || null } : {}),
      ...(location !== undefined ? { location: location || null } : {}),
      ...(mode ? { mode: String(mode).toUpperCase() } : {}),
      ...(creatorId ? { creatorId } : {}),
    };

    const data = await model.update({ where: { id }, data: payload, select: found.select });

    await writeAuditLog({
      adminId: req.admin.id,
      action: `UPDATE_${type.toUpperCase()}`,
      entityType: type.toUpperCase(),
      entityId: id,
      metadata: payload,
      ipAddress: req.ip,
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: "Failed to update content" });
  }
}

async function deleteContent(req, res) {
  try {
    const { type, id } = req.params;
    const found = getModel(type);
    const model = prisma[found.model];
    await model.delete({ where: { id } });

    await writeAuditLog({
      adminId: req.admin.id,
      action: `DELETE_${type.toUpperCase()}`,
      entityType: type.toUpperCase(),
      entityId: id,
      ipAddress: req.ip,
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete content" });
  }
}


async function createContent(req, res) {
  try {
    const { type } = req.params;
    const found = getModel(type);
    const model = prisma[found.model];

    if (type === "events") {
      const { title, description, communityId, date, location, mode = "OFFLINE", creatorId, image } = req.body;
      if (!title || !description || !date || !creatorId) {
        return res.status(400).json({ error: "Missing required fields for event creation" });
      }
      const data = await model.create({
        data: {
          title,
          description,
          date: new Date(date),
          communityId: communityId || null,
          location: location || null,
          mode: String(mode).toUpperCase(),
          creatorId,
          image: image || "",
        },
        select: found.select,
      });

      await writeAuditLog({
        adminId: req.admin.id,
        action: `CREATE_${type.toUpperCase()}`,
        entityType: type.toUpperCase(),
        entityId: data.id,
        metadata: req.body,
        ipAddress: req.ip,
      });

      return res.status(201).json({ data });
    }

    return res.status(400).json({ error: `Creation for ${type} is not supported` });
  } catch (error) {
    res.status(500).json({ error: "Failed to create content" });
  }
}

module.exports = {
  listContent,
  createContent,
  updateContent,
  deleteContent,
};
