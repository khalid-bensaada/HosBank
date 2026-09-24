import {connection} from "../../config/database.js";
import { loadHistory } from "./navigationcontroller.js";

import crypto from "crypto";

export async function showDashboard(req, res) {
    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.redirect("/auth/login");
        }

        const [users] = await connection.query(
            "SELECT id, nom, prenom, email, telephone, adresse FROM utilisateur WHERE id = ?",
            [userId]
        );

        const [balances] = await connection.query(
            `SELECT
                COALESCE(SUM(CASE WHEN UPPER(typedecompte) = 'COURANT' THEN solde ELSE 0 END), 0) AS currentBalance,
                COALESCE(SUM(CASE WHEN UPPER(typedecompte) = 'EPARGNE' THEN solde ELSE 0 END), 0) AS savingsBalance,
                COALESCE(SUM(solde), 0) AS totalBalance
             FROM \`compte_bancaire\`
             WHERE clientId = ?`,
            [userId]
        );

        const accountBalances = balances[0] || {};

        const user = users[0];

        if (!user) {
            return req.session.destroy(() => res.redirect("/auth/login"));
        }

        const transactions = await loadHistory(userId, 6);
        return res.render("clients/dashboard", {
            transactions,
            user,
            currentBalance: accountBalances.currentBalance,
            savingsBalance: accountBalances.savingsBalance,
            totalBalance: accountBalances.totalBalance
        });
    } catch (error) {
        console.error("Error while loading the dashboard:", error);
        return res.status(500).send("Server error");
    }
}

export async function showAccounts(req, res) {
    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.redirect("/auth/login");
        }

        const [users] = await connection.query(
            "SELECT id, nom, prenom, email FROM utilisateur WHERE id = ?",
            [userId]
        );

        const user = users[0];

        if (!user) {
            return req.session.destroy(() => res.redirect("/auth/login"));
        }

        const [comptes] = await connection.query(
            `SELECT id, numeroCompte, iban, typedecompte, solde, status, dateOuverture
             FROM \`compte_bancaire\`
             WHERE clientId = ?
             ORDER BY dateOuverture ASC`,
            [userId]
        );

        const messages = {
            opened: "Votre demande de compte epargne est en attente de verification.",
            "savings-exists": "Vous possedez deja un compte epargne.",
            conditions: "Veuillez accepter les conditions pour continuer.",
            "invalid-amount": "Saisissez un montant superieur a 0 MAD, avec deux decimales maximum.",
            "principal-account": "Aucun compte courant actif n'est disponible pour ce virement.",
            "insufficient-balance": "Le solde de votre compte courant est insuffisant."
        };

        const status = typeof req.query.opened === "string" ? "opened" : "";
        const error = typeof req.query.error === "string" ? req.query.error : "";

        return res.render("clients/account", {
            user,
            comptes,
            success: status === "opened" ? messages.opened : "",
            error: messages[error] || ""
        });
    } catch (error) {
        console.error("Error while loading accounts:", error);
        return res.status(500).send("Server error");
    }
}

export async function createSavingsAccount(req, res) {
    let databaseConnection;

    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.redirect("/auth/login");
        }

        const amountInput = String(req.body.initialAmount || "").trim().replace(",", ".");
        const initialAmount = Number(amountInput);

        if (
            !Number.isFinite(initialAmount) ||
            initialAmount <= 0 ||
            !/^\d{1,13}(\.\d{1,2})?$/.test(amountInput)
        ) {
            return res.redirect("/dashboard/comptes?error=invalid-amount#ouvrir-epargne");
        }

        if (req.body.acceptTerms !== "on") {
            return res.redirect("/dashboard/comptes?error=conditions#ouvrir-epargne");
        }

        const amount = initialAmount.toFixed(2);
        databaseConnection = await connection.getConnection();
        await databaseConnection.beginTransaction();

        const [principalAccounts] = await databaseConnection.query(
            `SELECT id, solde
             FROM \`compte_bancaire\`
             WHERE clientId = ?
               AND UPPER(typedecompte) = ?
               AND status = ?
             LIMIT 1 FOR UPDATE`,
            [userId, "COURANT", "active"]
        );

        const principalAccount = principalAccounts[0];

        if (!principalAccount) {
            throw new Error("NO_PRINCIPAL_ACCOUNT");
        }

        const [existingAccounts] = await databaseConnection.query(
            `SELECT id
             FROM \`compte_bancaire\`
             WHERE clientId = ? AND UPPER(typedecompte) = ?
             LIMIT 1`,
            [userId, "EPARGNE"]
        );

        if (existingAccounts.length > 0) {
            throw new Error("SAVINGS_ACCOUNT_EXISTS");
        }

        if (Number(principalAccount.solde) < initialAmount) {
            throw new Error("INSUFFICIENT_BALANCE");
        }

        const entropy = crypto.randomBytes(8).toString("hex").toUpperCase();
        const numeroCompte = `HOS-${entropy.slice(0, 4)}-${entropy.slice(4, 12)}`;
        const iban = `MA${crypto.randomInt(10, 100)}HOS${entropy}`;

        await databaseConnection.query(
            `UPDATE \`compte_bancaire\`
             SET solde = solde - ?
             WHERE id = ?`,
            [amount, principalAccount.id]
        );

        await databaseConnection.query(
            `INSERT INTO \`compte_bancaire\`
             (numeroCompte, iban, typedecompte, solde, status, clientId)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [numeroCompte, iban, "EPARGNE", amount, "inactive", userId]
        );

        await databaseConnection.commit();
        return res.redirect("/dashboard/comptes?opened=savings");
    } catch (error) {
        if (databaseConnection) {
            await databaseConnection.rollback();
        }

        const errors = {
            NO_PRINCIPAL_ACCOUNT: "principal-account",
            SAVINGS_ACCOUNT_EXISTS: "savings-exists",
            INSUFFICIENT_BALANCE: "insufficient-balance"
        };

        if (errors[error.message]) {
            return res.redirect(`/dashboard/comptes?error=${errors[error.message]}#ouvrir-epargne`);
        }

        console.error("Error while creating savings account:", error);
        return res.status(500).send("Server error");
    } finally {
        databaseConnection?.release();
    }
}
