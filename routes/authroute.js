import express from "express";

import {showRegister, showLogin, register, verifyEmail, login, logout} from "../controllers/authcontroller.js";


const router = express.Router();


router.get(
    "/register",
    showRegister
);


router.get(
    "/login",
    showLogin
);


router.post(
    "/register",
    register
);


router.get(
    "/verify-email",
    verifyEmail
);

router.post("/logout", logout);

router.post(
    "/login", login
)



export default router;
