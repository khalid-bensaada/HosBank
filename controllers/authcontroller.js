import bcrypt from "bcrypt";
import crypto from "crypto";

import {connection} from "../config/database.js";
import transporter from "../config/mail.js";

//function to render to auth/register

export function showRegister(req, res){
    res.render("auth/register");
}

export function showLogin(req, res){
    res.render("auth/login");
}

export function logout(req, res) {
    req.session.destroy((error) => {
        if (error) {
            console.error("Logout error:", error);
            return res.status(500).send("Server error");
        }

        res.clearCookie("connect.sid");
        return res.redirect("/auth/login");
    });
}

// function of register

export async function register(req, res){

    try{
        const {nom, prenom, email, motdepass, telephone, adresse} = req.body; 

        if(!nom || !prenom || !email || !motdepass || !telephone || !adresse){
            return res.status(400).render("auth/register", {
                error: "all fields are required"
            });
        }

        const [users] = await connection.query(
            "select * from utilisateur where email = ?", [email]
        );
        if(users.length > 0){
            return res.status(400).render("auth/register", {
                error : "email already exists !"
            });
        }

        const hashPassword = await bcrypt.hash(motdepass, 10);

        const verificationToken = crypto.randomBytes(32).toString('hex');


        await connection.query(
            `INSERT INTO utilisateur 
            (nom, prenom, email, motDePass, telephone, adresse, emailVerifie, roleId, verification_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nom,
                prenom,
                email,
                hashPassword,
                telephone,
                adresse,
                false,
                1,
                verificationToken
            ]
        );


        const verificationLink = `${process.env.BASE_URL}/auth/verify-email?token=${verificationToken}`;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,

            to: email,

            subject: "Verify you Hosbank Account",

            html: `
            <h2>Welcome To HosBank</h2>

            <p>
                click the link below to verify your account :
            </p>

            <a href="${verificationLink}">
                Verify my account
            </a>
            `
        });

        return res.render("auth/register", {
            success: "Account created. Check your email."
        })


    }catch (error) {

        console.log(error);

        return res.status(500).send(
            "Server error"
        );

    }
}

export async function verifyEmail(req, res) {
    try {
        const { token } = req.query;

        const [users] = await connection.query(
            `SELECT id, prenom
             FROM utilisateur
             WHERE verification_token = ?`,
            [token]
        );

        if (users.length === 0) {
            return res.status(400).send("Invalid verification link");
        }

        await connection.query(
            `UPDATE utilisateur
             SET emailVerifie = TRUE,
                 verification_token = NULL
             WHERE id = ?`,
            [users[0].id]
        );

        return res.render("auth/emailvalid", {
            prenom: users[0].prenom
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Server error");
    }
}

export async function login(req, res){
    try {
        const {email, motdepass} = req.body;

        if (!email || !motdepass) {
            return res.status(400).render("auth/login", {
                error: "Email et mot de passe sont obligatoires."
            });
        }

        const [users] = await connection.query(
            "SELECT * FROM utilisateur WHERE email = ?",
            [email]
        );

        const user = users[0];

        if (!user) {
            return res.status(401).render("auth/login", {
                error: "Email ou Mot De Passe Incorrect."
            });
        }

        const passwordValide = await bcrypt.compare(motdepass, user.motDePass);

        if (!passwordValide) {
            return res.status(401).render("auth/login", {
                error: "Email ou Mot De Passe Incorrect."
            });
        }

        if (!user.emailVerifie) {
            return res.status(403).render("auth/login", {
                error: "Verifier ton Email avant se connecter."
            });
        }

        req.session.userId = user.id;

        return req.session.save((error) => {
            if (error) {
                console.error("Error while saving the session:", error);
                return res.status(500).send("Server error");
            }

            return res.redirect("/dashboard");
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).send("Server error");
    }
}
