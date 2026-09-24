import express from "express";

import { isAuthenticated } from "../middleware/authmiddleware.js";

import {
    showDashboard,
    showAccounts,
    createSavingsAccount
} from "../controllers/clientcontrollers/dashboardcontroller.js";
import {
    addBenif,
    showBeneficiaries
} from "../controllers/clientcontrollers/beneficiairescontroller.js";

import {
    showVirements,
    executeVirement
} from "../controllers/clientcontrollers/virementcontroller.js";
import {
    showReclamations,
    createReclamation,
    deleteReclamation
} from "../controllers/clientcontrollers/reclamationcontroller.js";

const router = express.Router();

router.use(isAuthenticated);

router.get("/", showDashboard);
router.get("/comptes", showAccounts);
router.post("/comptes/epargne", createSavingsAccount);

router.get("/beneficiaires", showBeneficiaries);
router.post("/beneficiaires", addBenif);

router.get("/virements", showVirements);
router.post("/virements", executeVirement);

router.get("/reclamations", showReclamations);
router.post("/reclamations", createReclamation);
router.post("/reclamations/:id/delete", deleteReclamation);

export default router;
