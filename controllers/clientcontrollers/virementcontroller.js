import { connection } from "../../config/database.js";

export async function showVirements(req, res) {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.redirect("/auth/login");
        }

        // Récupérer les informations de l'utilisateur connecté
        const [users] = await connection.query(
            "SELECT id, nom, prenom, email FROM utilisateur WHERE id = ?",
            [userId]
        );
        const user = users[0];
        if (!user) {
            return req.session.destroy(() => res.redirect("/auth/login"));
        }

        //Récupérer tous les comptes actifs de l'utilisateur
        const [comptes] = await connection.query(
            `SELECT id, numeroCompte, iban, typedecompte, solde, status
             FROM \`compte_bancaire\`
             WHERE clientId = ? AND status = 'active'
             ORDER BY typedecompte ASC`,
            [userId]
        );

        // Récupérer la liste des bénéficiaires enregistrés par l'utilisateur
        const [beneficiaires] = await connection.query(
            `SELECT id, name, iban, bank_name
             FROM beneficiaries
             WHERE user_id = ?
             ORDER BY name ASC`,
            [userId]
        );

        // Récupérer l'historique des virements émis par l'utilisateur
        const [virements] = await connection.query(
            `SELECT 
                v.id,
                v.reference,
                v.montant,
                v.motif,
                v.statut,
                v.dateCreation,
                cs.numeroCompte AS sourceCompteNumero,
                cs.typedecompte AS sourceCompteType,
                b.name AS destinataireNom,
                b.iban AS destinataireIban,
                cd.numeroCompte AS destCompteNumero,
                cd.typedecompte AS destCompteType
             FROM virement v
             JOIN \`compte_bancaire\` cs ON v.compteSourceId = cs.id
             LEFT JOIN beneficiaries b ON v.beneficiaireId = b.id
             LEFT JOIN \`compte_bancaire\` cd ON v.compteDestId = cd.id
             WHERE cs.clientId = ?
             ORDER BY v.id DESC
             LIMIT 30`,
            [userId]
        );

        // Dictionnaire des messages de succès et d'erreur
        const messages = {
            "effectue": "Le virement a été exécuté avec succès.",
            "champs-requis": "Veuillez renseigner tous les champs obligatoires.",
            "montant-invalide": "Veuillez saisir un montant valide supérieur à 0 MAD.",
            "solde-insuffisant": "Solde insuffisant sur le compte émetteur.",
            "compte-source-invalide": "Compte émetteur introuvable ou inactif.",
            "destinataire-invalide": "Veuillez sélectionner un destinataire valide.",
            "meme-compte": "Le compte émetteur et le compte destinataire ne peuvent pas être identiques.",
            "erreur-serveur": "Une erreur est survenue lors de l'exécution du virement."
        };

        const successCode = typeof req.query.success === "string" ? req.query.success : "";
        const errorCode = typeof req.query.error === "string" ? req.query.error : "";
        const reference = typeof req.query.ref === "string" ? req.query.ref : "";

        // Afficher la vue EJS avec toutes les données
        return res.render("clients/virements", {
            user,
            comptes,
            beneficiaires,
            virements,
            reference,
            success: messages[successCode] || "",
            error: messages[errorCode] || ""
        });

    } catch (error) {
        console.error("Erreur lors de l'affichage des virements :", error);
        return res.status(500).send("Erreur serveur");
    }
}


export async function executeVirement(req, res) {
    let dbConnection;

    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.redirect("/auth/login");
        }

        // Récupération des données du formulaire
        const compteSourceId = parseInt(req.body.compteSourceId, 10);
        const typeDestinataire = String(req.body.typeDestinataire || "beneficiaire").trim();
        const beneficiaireId = req.body.beneficiaireId ? parseInt(req.body.beneficiaireId, 10) : null;
        const compteDestId = req.body.compteDestId ? parseInt(req.body.compteDestId, 10) : null;
        const motif = String(req.body.motif || "Virement bancaire").trim();
        
        // Nettoyage et conversion du montant
        const rawMontant = String(req.body.montant || "").trim().replace(",", ".");
        const montant = parseFloat(rawMontant);

        // Validation basique des données
        if (!compteSourceId || isNaN(montant) || montant <= 0) {
            return res.redirect("/dashboard/virements?error=montant-invalide#nouveau-virement");
        }

        // Obtenir une connexion pour gérer la transaction SQL
        dbConnection = await connection.getConnection();
        await dbConnection.beginTransaction();

        // Vérifier et verrouiller le compte source (sécurité)
        const [sources] = await dbConnection.query(
            `SELECT id, numeroCompte, solde, typedecompte 
             FROM \`compte_bancaire\` 
             WHERE id = ? AND clientId = ? AND status = 'active'
             FOR UPDATE`,
            [compteSourceId, userId]
        );

        const sourceAccount = sources[0];
        if (!sourceAccount) {
            await dbConnection.rollback();
            return res.redirect("/dashboard/virements?error=compte-source-invalide#nouveau-virement");
        }

        const soldeActuel = parseFloat(sourceAccount.solde);
        if (soldeActuel < montant) {
            await dbConnection.rollback();
            return res.redirect("/dashboard/virements?error=solde-insuffisant#nouveau-virement");
        }

        let finalBeneficiaireId = null;
        let finalCompteDestId = null;
        let destinataireNom = "";

        // Cas A : Virement interne (vers un autre compte du client)
        if (typeDestinataire === "interne") {
            if (!compteDestId) {
                await dbConnection.rollback();
                return res.redirect("/dashboard/virements?error=destinataire-invalide#nouveau-virement");
            }

            if (compteDestId === compteSourceId) {
                await dbConnection.rollback();
                return res.redirect("/dashboard/virements?error=meme-compte#nouveau-virement");
            }

            // Vérifier que le compte destinataire appartient bien au même client
            const [destComptes] = await dbConnection.query(
                `SELECT id, numeroCompte, solde, typedecompte 
                 FROM \`compte_bancaire\` 
                 WHERE id = ? AND clientId = ?
                 FOR UPDATE`,
                [compteDestId, userId]
            );

            const destAccount = destComptes[0];
            if (!destAccount) {
                await dbConnection.rollback();
                return res.redirect("/dashboard/virements?error=destinataire-invalide#nouveau-virement");
            }

            finalCompteDestId = destAccount.id;
            destinataireNom = `Compte ${destAccount.typedecompte} (${destAccount.numeroCompte})`;

            // Créditer le compte destinataire
            await dbConnection.query(
                "UPDATE `compte_bancaire` SET solde = solde + ? WHERE id = ?",
                [montant, finalCompteDestId]
            );

        } else {
            // Cas B : Virement vers un bénéficiaire enregistré
            if (!beneficiaireId) {
                await dbConnection.rollback();
                return res.redirect("/dashboard/virements?error=destinataire-invalide#nouveau-virement");
            }

            const [benefs] = await dbConnection.query(
                "SELECT id, name, iban FROM beneficiaries WHERE id = ? AND user_id = ?",
                [beneficiaireId, userId]
            );

            const benef = benefs[0];
            if (!benef) {
                await dbConnection.rollback();
                return res.redirect("/dashboard/virements?error=destinataire-invalide#nouveau-virement");
            }

            finalBeneficiaireId = benef.id;
            destinataireNom = benef.name;
        }

        // Débiter le compte source
        await dbConnection.query(
            "UPDATE `compte_bancaire` SET solde = solde - ? WHERE id = ?",
            [montant, compteSourceId]
        );

        // Générer une référence unique pour le virement
        const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        const reference = `VIR-${Date.now().toString().slice(-6)}-${randomCode}`;

        // Enregistrer dans la table `virement`
        await dbConnection.query(
            `INSERT INTO virement 
             (reference, montant, motif, statut, compteSourceId, beneficiaireId, compteDestId, dateCreation)
             VALUES (?, ?, ?, 'EFFECTUE', ?, ?, ?, NOW())`,
            [reference, montant, motif, compteSourceId, finalBeneficiaireId, finalCompteDestId]
        );

        // Enregistrer aussi dans la table `transactions` pour la cohérence globale
        await dbConnection.query(
            `INSERT INTO transactions 
             (from_account_id, to_account_id, beneficiary_name, amount, type, description, reference, created_at)
             VALUES (?, ?, ?, ?, 'VIREMENT_EMIS', ?, ?, NOW())`,
            [compteSourceId, finalCompteDestId, destinataireNom, montant, motif, reference]
        );

        if (finalCompteDestId) {
            // Si virement interne, enregistrer aussi l'entrée de réception
            await dbConnection.query(
                `INSERT INTO transactions 
                 (from_account_id, to_account_id, beneficiary_name, amount, type, description, reference, created_at)
                 VALUES (?, ?, ?, ?, 'VIREMENT_RECU', ?, ?, NOW())`,
                [compteSourceId, finalCompteDestId, `Depuis ${sourceAccount.typedecompte}`, montant, motif, reference]
            );
        }

        // Valider définitivement la transaction
        await dbConnection.commit();

        return res.redirect(`/dashboard/virements?success=effectue&ref=${reference}`);

    } catch (error) {
        // En cas d'erreur, annuler toute modification
        if (dbConnection) {
            await dbConnection.rollback();
        }
        console.error("Erreur lors de l'exécution du virement :", error);
        return res.redirect("/dashboard/virements?error=erreur-serveur#nouveau-virement");
    } finally {
        // Toujours libérer la connexion vers le pool
        if (dbConnection) {
            dbConnection.release();
        }
    }
}
