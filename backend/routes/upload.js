const express = require("express");
const multer = require("multer");
const prisma = require("../prisma");
const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post(
  "/profile-image",
  upload.single("image"),
  async (req, res) => {
    try {
      const imageUrl = `/uploads/${req.file.filename}`;

      await prisma.user.update({
        where: { id: req.body.userId },
        data: { image: imageUrl },
      });

      res.json({ image: imageUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

module.exports = router;
