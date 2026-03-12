const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

router.post("/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  if (!userId) return res.status(401).json({ error: "User ID required" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { saves: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const existingSave = user.saves.find(s => s.postId === postId);

    let saved;
    if (existingSave) {
      await prisma.save.delete({ where: { id: existingSave.id } });
      saved = false;
    } else {
      await prisma.save.create({ data: { userId, postId } });
      saved = true;
    }

    const savedCount = await prisma.save.count({ where: { postId } });

    res.json({ saved, savedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle save" });
  }
});

module.exports = router;
