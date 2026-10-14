
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
} from "../controllers/leads.controller";

const router = Router();

router.use(authenticate);

router.get("/", getLeads);
router.post("/", createLead);
router.put("/:id", updateLead);
router.delete("/:id", deleteLead);

export default router;
