import { connection } from "../../config/database.js";

const BENEFICIARY_TABLE = "`beneficiaries`";

function redirectToBeneficiaries(res, key, value) {
    return res.redirect(`/dashboard/beneficiaires?${key}=${value}#ajouter-beneficiaire`);
}

export async function showBeneficiaries(req, res) {
    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.redirect("/auth/login");
        }

        const [beneficiaries] = await connection.query(
            `SELECT id, name, iban, bank_name, created_at
             FROM ${BENEFICIARY_TABLE}
             WHERE user_id = ?
             ORDER BY created_at DESC, id DESC`,
            [userId]
        );

        const messages = {
            added: "Le beneficiaire a ete ajoute avec succes.",
            required: "Veuillez renseigner le nom, l'IBAN et la banque.",
            invalid: "Veuillez saisir un IBAN valide.",
            duplicate: "Ce beneficiaire est deja enregistre.",
            unavailable: "Impossible d'ajouter le beneficiaire pour le moment."
        };

        const success = typeof req.query.success === "string" ? req.query.success : "";
        const error = typeof req.query.error === "string" ? req.query.error : "";

        return res.render("clients/beneficiaries", {
            beneficiaries,
            success: messages[success] || "",
            error: messages[error] || ""
        });
    } catch (error) {
        console.error("Error while loading beneficiaries:", error);
        return res.status(500).send("Server error");
    }
}

export async function addBenif(req, res) {
    try {
        console.log("Form body received:", req.body); // Check what data arrives

        const userId = req.session?.userId;

        if (!userId) {
            return res.redirect("/auth/login");
        }

        const beneficiaryName = String(req.body.beneficiaryName || "").trim();
        const beneficiaryIban = String(req.body.beneficiaryIban || "")
            .replace(/\s/g, "")
            .toUpperCase();
        
        // Optional bank name (defaults to empty string if missing)
        const beneficiaryBank = String(req.body.beneficiaryBank || "").trim();

        if (!beneficiaryName || !beneficiaryIban) {
            return redirectToBeneficiaries(res, "error", "required");
        }

        const ibanPattern = /^[A-Z]{2}[A-Z0-9]{13,32}$/i;

        if (beneficiaryName.length > 200 || !ibanPattern.test(beneficiaryIban)) {
            return redirectToBeneficiaries(res, "error", "invalid");
        }

        const [existingBeneficiaries] = await connection.query(
            `SELECT id
             FROM ${BENEFICIARY_TABLE}
             WHERE user_id = ? AND iban = ?
             LIMIT 1`,
            [userId, beneficiaryIban]
        );

        if (existingBeneficiaries.length > 0) {
            return redirectToBeneficiaries(res, "error", "duplicate");
        }

        await connection.query(
            `INSERT INTO ${BENEFICIARY_TABLE}
             (user_id, name, iban, bank_name)
             VALUES (?, ?, ?, ?)`,
            [userId, beneficiaryName, beneficiaryIban, beneficiaryBank]
        );

        return redirectToBeneficiaries(res, "success", "added");
    } catch (error) {
        return redirectToBeneficiaries(res, "error", "unavailable");
    }
}