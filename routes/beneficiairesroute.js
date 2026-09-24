import { showBeneficiaries, addBenif } from "../controllers/clientcontrollers/beneficiairescontroller.js";

router.get("/dashboard/beneficiaires", showBeneficiaries);

router.post("/dashboard/beneficiaires", addBenif);