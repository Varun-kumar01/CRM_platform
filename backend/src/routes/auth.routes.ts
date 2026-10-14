import { Router } from "express";
import {
  registerCompany,
  login,
} from "../controllers/auth.controllers";

const router = Router();

router.post("/register", registerCompany);
router.post("/login", login);

export default router;