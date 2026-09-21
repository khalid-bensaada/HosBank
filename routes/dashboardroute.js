import express from "express";

import {
    showDashboard,
    showAccounts,
    createSavingsAccount
} from "../controllers/clientcontrollers/dashboardcontroller.js";

const router = express.Router();

router.get("/", showDashboard);
router.get("/comptes", showAccounts);
router.post("/comptes/epargne", createSavingsAccount);

export default router;
