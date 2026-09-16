import express from "express";

import {showRegister, register, verifyEmail} from "../controllers/authcontroller.js";


const router = express.Router();


router.get(
    "/register",
    showRegister
);


router.post(
    "/register",
    register
);


router.get(
    "/verify-email",
    verifyEmail
);



export default router;