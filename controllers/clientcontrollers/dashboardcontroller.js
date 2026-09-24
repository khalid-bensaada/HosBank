import {connection} from "../../config/database.js";
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
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

        return res.render("clients/dashboard", {
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
            !Number.isInteger(initialAmount * 100)
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



function categorizeOperation(operation) {
    const desc = (operation.description || '').toLowerCase();

    if (desc.includes('salaire') || desc.includes('lumina')) return 'Revenus';
    if (desc.includes('restaurant') || desc.includes('boulangerie')) return 'Restauration';
    if (desc.includes('marché') || desc.includes('bio') || desc.includes('alimentation')) return 'Alimentation';
    if (desc.includes('spotify') || desc.includes('abonnement')) return 'Abonnement';
    if (desc.includes('remboursement') || desc.includes('transfert')) return 'Transfert';
    if (desc.includes('sncf') || desc.includes('voyage')) return 'Voyages';

    return 'Autre';
}

function generateCardNumber() {
    let number = '';
    for (let i = 0; i < 16; i++) {
        number += Math.floor(Math.random() * 10);
    }
    return number;
}



export async function getUserInfo(req, res) {
    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        const [users] = await connection.query(
            "SELECT nom, prenom FROM utilisateur WHERE id = ?",
            [userId]
        );

        const user = users[0];

        if (!user) {
            return res.status(404).json({ message: 'undefined User' });
        }

        return res.status(200).json({
            nom: user.nom,
            prenom: user.prenom
        });
    } catch (error) {
        console.error('Error about get user', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

export async function getComptes(req, res) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        const comptes = await connection('Compte bancaire')
            .select('id', 'numeroCompte', 'iban', 'typedecompte', 'solde', 'status')
            .where({ clientId: userId });

        return res.status(200).json(comptes);
    } catch (error) {
        console.error('Error about get comptes', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

export async function getPatrimoineTotal(req, res) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        const result = await connection('Compte bancaire')
            .where({ clientId: userId })
            .sum('solde as total');

        const total = parseFloat(result[0]?.total) || 0;

        return res.status(200).json({
            patrimoineTotal: total
        });
    } catch (error) {
        console.error('Error about get patrimoine', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

export async function getRecentOperations(req, res) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        const operations = await connection('Opération')
            .join('Compte bancaire', 'Opération.compteId', '=', 'Compte bancaire.id')
            .where('Compte bancaire.clientId', userId)
            .select(
                'Opération.*',
                'Compte bancaire.numeroCompte'
            )
            .orderBy('Opération.dateOperation', 'desc')
            .limit(6);

        const categorizedOperations = operations.map(operation => {
            return {
                ...operation,
                category: categorizeOperation(operation)
            };
        });

        return res.status(200).json({
            operations: categorizedOperations
        });
    } catch (error) {
        console.error('Error about get recent operations', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

export async function getOperationDetails(req, res) {
    try {
        const userId = req.user?.id;
        const { operationId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        if (!operationId) {
            return res.status(400).json({ message: 'Operation ID is required' });
        }

        const operation = await connection('Opération')
            .join('Compte bancaire', 'Opération.compteId', '=', 'Compte bancaire.id')
            .where({
                'Opération.id': operationId,
                'Compte bancaire.clientId': userId
            })
            .select(
                'Opération.*',
                'Compte bancaire.numeroCompte',
                'Compte bancaire.typedecompte'
            )
            .first();

        if (!operation) {
            return res.status(404).json({ message: 'Operation not found or access denied' });
        }

        return res.status(200).json({ operation });
    } catch (error) {
        console.error('Error about get operation details', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

export async function createVirement(req, res) {
    try {
        const userId = req.user?.id;
        const { compteSourceId, beneficiaireId, montant, motif } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        const numericMontant = parseFloat(montant);
        if (!compteSourceId || !beneficiaireId || isNaN(numericMontant) || numericMontant <= 0) {
            return res.status(400).json({ message: 'Invalid inputs or montant must be greater than 0' });
        }

        const result = await connection.transaction(async (trx) => {

            const compteSource = await trx('Compte bancaire')
                .where({ id: compteSourceId, clientId: userId })
                .select('solde')
                .first();

            if (!compteSource) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }

            const soldeAvant = parseFloat(compteSource.solde);

            if (soldeAvant < numericMontant) {
                throw new Error('INSUFFICIENT_FUNDS');
            }

            const soldeApres = soldeAvant - numericMontant;
            const reference = `VIR-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

            await trx('Compte bancaire')
                .where({ id: compteSourceId })
                .update({ solde: soldeApres });

            const [virementId] = await trx('Virement').insert({
                reference,
                montant: numericMontant,
                motif: motif || '',
                statut: 'terminé',
                compteSourceId,
                beneficiaireId
            });

            await trx('Opération').insert({
                typeOperation: 'VIREMENT',
                montant: -numericMontant,
                soldeAvant,
                soldeApres,
                description: motif || 'Virement',
                compteId: compteSourceId,
                virmentId: virementId
            });

            return { reference, virementId, soldeApres };
        });

        return res.status(200).json({
            message: 'Virement executed successfully',
            reference: result.reference,
            newSolde: result.soldeApres
        });

    } catch (error) {
        if (error.message === 'ACCOUNT_NOT_FOUND') {
            return res.status(404).json({ message: 'Source account not found or access denied' });
        }
        if (error.message === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ message: 'Solde insuffisant pour effectuer le virement' });
        }

        console.error('Error executing virement', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

export async function createCarteVirtuelle(req, res) {
    try {
        const userId = req.user?.id;
        const { compteId } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        if (!compteId) {
            return res.status(400).json({ message: 'Compte ID is required' });
        }

        const compte = await connection('Compte bancaire')
            .where({ id: compteId, clientId: userId })
            .first();

        if (!compte) {
            return res.status(404).json({ message: 'Account not found or access denied' });
        }

        const numerodeCart = generateCardNumber();

        const dateExperation = new Date();
        dateExperation.setFullYear(dateExperation.getFullYear() + 3);

        const newCard = {
            numerodeCart,
            dateExperation,
            typeCarte: 'VIRTUELLE',
            status: 'active',
            compteId
        };

        const [carteId] = await connection('Carte bancaire').insert(newCard);

        return res.status(201).json({
            message: 'Virtual card created successfully',
            carte: {
                id: carteId,
                ...newCard
            }
        });

    } catch (error) {
        console.error('Error creating virtual card', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

export async function downloadRib(req, res) {
    try {
        const userId = req.user?.id;
        const { compteId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        if (!compteId) {
            return res.status(400).json({ message: 'Compte ID is required' });
        }

        const data = await connection('Compte bancaire')
            .join('Utilisateur', 'Compte bancaire.clientId', '=', 'Utilisateur.id')
            .where({
                'Compte bancaire.id': compteId,
                'Compte bancaire.clientId': userId
            })
            .select(
                'Compte bancaire.iban',
                'Compte bancaire.numeroCompte',
                'Compte bancaire.typedecompte',
                'Utilisateur.nom',
                'Utilisateur.prenom'
            )
            .first();

        if (!data) {
            return res.status(404).json({ message: 'Account not found or access denied' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=RIB_${data.numeroCompte}.pdf`);

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        doc.fontSize(20).text('Relevé d Identity Bancaire (RIB)', { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(12).text(`Titulaire du compte: ${data.nom} ${data.prenom}`);
        doc.text(`Type de compte: ${data.typedecompte}`);
        doc.moveDown();

        doc.fontSize(14).text('Informations Bancaires:', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Numéro de Compte: ${data.numeroCompte}`);
        doc.text(`IBAN: ${data.iban}`);
        doc.moveDown(2);

        doc.fontSize(10).text('Document généré automatiquement par le système bancaire.', { align: 'center', italic: true });

        doc.end();

    } catch (error) {
        console.error('Error downloading RIB', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

export async function getBeneficiaires(req, res) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        const beneficiaires = await connection('Bénéficiaire')
            .where({ clientId: userId })
            .select('id', 'nomComplet', 'iban', 'nomBanque', 'statut');

        return res.status(200).json({ beneficiaires });

    } catch (error) {
        console.error('Error about get beneficiaires', error);
        return res.status(500).json({ message: 'error in server' });
    }
};
