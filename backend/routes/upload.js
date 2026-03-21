const express = require("express");
const prisma = require("../prisma");
const { memoryUpload, uploadBufferToSupabase } = require("../lib/supabaseStorage");

const router = express.Router();

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(error);
      res.status(error.statusCode || 500).json({ error: error.message || "Upload failed" });
    }
  };
}

router.post(
  "/",
  memoryUpload.single("file"),
  asyncRoute(async (req, res) => {
    const { type } = req.body;
    const { url } = await uploadBufferToSupabase(req.file, type);
    res.status(201).json({ url });
  }),
);

router.post(
  "/profile-image",
  memoryUpload.single("image"),
  asyncRoute(async (req, res) => {
    const { url } = await uploadBufferToSupabase(req.file, "profile");

    await prisma.user.update({
      where: { id: req.body.userId },
      data: { image: url },
    });

    res.status(201).json({ url, image: url });
  }),
);

router.post(
  "/event-media",
  memoryUpload.single("media"),
  asyncRoute(async (req, res) => {
    const { url } = await uploadBufferToSupabase(req.file, "event");
    res.status(201).json({ url, media: url, image: url });
  }),
);

router.post(
  "/event-image",
  memoryUpload.single("image"),
  asyncRoute(async (req, res) => {
    const { url } = await uploadBufferToSupabase(req.file, "event");
    res.status(201).json({ url, image: url, media: url });
  }),
);

module.exports = router;
