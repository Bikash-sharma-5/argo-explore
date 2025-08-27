import express from "express";
import { getProfiles,ingestProfiles } from "../controllers/dataController.js";

const router = express.Router();

router.get("/profiles", getProfiles);
router.post("/profiles",ingestProfiles);
export default router;
