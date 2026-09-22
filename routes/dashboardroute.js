import express from "express";

import {showDashboard} from "../controllers/clientcontrollers/dashboardcontroller.js";

const router = express.Router();

router.get("/", showDashboard);

export default router;

