import { showBeneficiaries, addBenif } from "../controllers/clientcontrollers/beneficiairescontroller.js";
import express from "express";
import { isAuthenticated } from "../middleware/authmiddleware.js";

const router = express.Router();
router.use(isAuthenticated);

router.get("/dashboard/beneficiaires", showBeneficiaries);

router.post("/dashboard/beneficiaires", addBenif);

export default router;
