const express = require("express");
const auth = require("../middleware/auth");
const content = require("../services/localContentService");
const { sendSystemMessage } = require("../services/systemMessageService");

const router = express.Router();

router.get("/", (_req, res) => res.json({ data: content.listEvents() }));

router.get("/:id", (req, res) => {
  const event = content.getEvent(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  res.json(event);
});

router.post("/:id/participate", auth, async (req, res) => {
  try {
    const event = content.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.actionType === "LINK") {
      return res.json({ actionType: "LINK", externalLink: event.externalLink });
    }
    const result = content.participateInEvent(event.id, req.user.id);
    if (!result.alreadyParticipating) {
      await sendSystemMessage(
        req.user.id,
        event.detailsMessage || `Thanks for participating in "${event.title}". We will contact you with next steps.`,
        "/events"
      );
    }
    res.status(result.alreadyParticipating ? 200 : 201).json({
      data: result.participation,
      alreadyParticipating: result.alreadyParticipating,
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
