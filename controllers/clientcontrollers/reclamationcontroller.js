import { connection } from "../../config/database.js";


export async function showReclamations(req, res) {
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

        const [reclamations] = await connection.query(
            `SELECT id, sujet, description, statut, dateCreation
             FROM \`réclamation\`
             WHERE utilisateurId = ?
             ORDER BY id DESC`,
            [userId]
        );

        const [comptes] = await connection.query(
            `SELECT id, numeroCompte, typedecompte
             FROM \`compte_bancaire\`
             WHERE clientId = ? AND status = 'active'`,
            [userId]
        );

        const messages = {
            "envoyee": "Votre réclamation a été transmise à notre service client avec succès.",
            "supprimee": "La réclamation a été retirée avec succès.",
            "champs-requis": "Veuillez préciser un sujet et une description pour votre réclamation.",
            "description-courte": "La description doit comporter au moins 10 caractères pour nous permettre de vous aider.",
            "introuvable": "Réclamation introuvable ou vous n'êtes pas autorisé à la supprimer.",
            "erreur-serveur": "Une erreur est survenue lors de l'enregistrement de votre réclamation."
        };

        const successCode = typeof req.query.success === "string" ? req.query.success : "";
        const errorCode = typeof req.query.error === "string" ? req.query.error : "";

        return res.render("clients/reclamations", {
            user,
            comptes,
            reclamations,
            success: messages[successCode] || "",
            error: messages[errorCode] || ""
        });

    } catch (error) {
        console.error("Erreur lors de l'affichage des réclamations :", error);
        return res.status(500).send("Erreur serveur");
    }
}


export async function createReclamation(req, res) {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.redirect("/auth/login");
        }

        const categorie = String(req.body.categorie || "Général").trim();
        const sujetTitre = String(req.body.sujet || "").trim();
        const description = String(req.body.description || "").trim();
        const compteId = req.body.compteId ? parseInt(req.body.compteId, 10) : null;

        if (!sujetTitre || !description) {
            return res.redirect("/dashboard/reclamations?error=champs-requis#nouvelle-reclamation");
        }

        if (description.length < 10) {
            return res.redirect("/dashboard/reclamations?error=description-courte#nouvelle-reclamation");
        }

        let fullSujet = `[${categorie}] ${sujetTitre}`;

        let finalDescription = description;
        if (compteId) {
            const [comptes] = await connection.query(
                "SELECT numeroCompte, typedecompte FROM `compte_bancaire` WHERE id = ? AND clientId = ?",
                [compteId, userId]
            );
            if (comptes.length > 0) {
                finalDescription = `Compte concerné : ${comptes[0].typedecompte} (${comptes[0].numeroCompte})\n\n${description}`;
            }
        }

        await connection.query(
            `INSERT INTO \`réclamation\` (sujet, description, utilisateurId, statut, dateCreation)
             VALUES (?, ?, ?, 'En attente', NOW())`,
            [fullSujet, finalDescription, userId]
        );

        return res.redirect("/dashboard/reclamations?success=envoyee");

    } catch (error) {
        console.error("Erreur lors de la création de la réclamation :", error);
        return res.redirect("/dashboard/reclamations?error=erreur-serveur#nouvelle-reclamation");
    }
}


export async function deleteReclamation(req, res) {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.redirect("/auth/login");
        }

        const reclamationId = parseInt(req.params.id, 10);
        if (!reclamationId) {
            return res.redirect("/dashboard/reclamations?error=introuvable");
        }

        const [result] = await connection.query(
            "DELETE FROM `réclamation` WHERE id = ? AND utilisateurId = ?",
            [reclamationId, userId]
        );

        if (result.affectedRows === 0) {
            return res.redirect("/dashboard/reclamations?error=introuvable");
        }

        return res.redirect("/dashboard/reclamations?success=supprimee");

    } catch (error) {
        console.error("Erreur lors de la suppression de la réclamation :", error);
        return res.redirect("/dashboard/reclamations?error=erreur-serveur");
    }
}
