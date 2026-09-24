
import { connection } from "../../config/database.js";


export async function renderComptesPage(req, res) {
    try {
        return res.render('admin/comptes');
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal server error");
    }
}


export async function getAllComptes(req, res) {
    try {
        const { search, type, status } = req.query;

        let sql = `
            SELECT cb.id, cb.numeroCompte, cb.iban, cb.typedecompte, cb.solde, 
                   cb.status, cb.dateOuverture, cb.clientId,
                   u.nom, u.prenom
            FROM \`Compte bancaire\` cb
            JOIN utilisateur u ON cb.clientId = u.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ` AND (cb.numeroCompte LIKE ? OR cb.iban LIKE ? OR u.nom LIKE ? OR u.prenom LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (type) {
            sql += ` AND cb.typedecompte = ?`;
            params.push(type);
        }

        if (status) {
            sql += ` AND cb.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY cb.id DESC`;

        const [comptes] = await connection.query(sql, params);

        return res.status(200).json({
            success: true,
            data: comptes
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "something wrong here",
            error: error.message
        });
    }
}


export async function getComptesStats(req, res) {
    try {
        const [totalResult] = await connection.query(
            `SELECT COUNT(*) as count FROM \`Compte bancaire\``
        );
        const total = totalResult[0].count;

        const [blockedResult] = await connection.query(
            `SELECT COUNT(*) as count FROM \`Compte bancaire\` WHERE status = 'bloqué'`
        );
        const blocked = blockedResult[0].count;

        const [totalSoldeResult] = await connection.query(
            `SELECT SUM(solde) as total FROM \`Compte bancaire\``
        );
        const totalSolde = parseFloat(totalSoldeResult[0].total) || 0;

        return res.status(200).json({
            success: true,
            data: {
                total,
                blocked,
                totalSolde
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "something wrong here",
            error: error.message
        });
    }
}


export async function getCompteById(req, res) {
    try {
        const { compteId } = req.params;

        const [comptes] = await connection.query(
            `SELECT cb.*, u.nom, u.prenom, u.email
             FROM \`Compte bancaire\` cb
             JOIN utilisateur u ON cb.clientId = u.id
             WHERE cb.id = ?`,
            [compteId]
        );

        if (comptes.length === 0) {
            return res.status(404).json({ message: 'Compte not found' });
        }

        const [operations] = await connection.query(
            `SELECT id, typeOperation, montant, soldeAvant, soldeApres, description, dateOperation
             FROM Opération
             WHERE compteId = ?
             ORDER BY dateOperation DESC
             LIMIT 10`,
            [compteId]
        );

        return res.status(200).json({
            success: true,
            data: {
                ...comptes[0],
                operations
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "something wrong here",
            error: error.message
        });
    }
}


export async function toggleCompteStatus(req, res) {
    try {
        const { compteId } = req.params;

        const [comptes] = await connection.query(
            `SELECT status FROM \`Compte bancaire\` WHERE id = ?`,
            [compteId]
        );

        if (comptes.length === 0) {
            return res.status(404).json({ message: 'Compte not found' });
        }

        const currentStatus = comptes[0].status;
        const newStatus = currentStatus === 'actif' ? 'bloqué' : 'actif';

        await connection.query(
            `UPDATE \`Compte bancaire\` SET status = ? WHERE id = ?`,
            [newStatus, compteId]
        );

        return res.status(200).json({
            success: true,
            message: `Compte ${newStatus === 'actif' ? 'débloqué' : 'bloqué'} avec succès`,
            status: newStatus
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "something wrong here",
            error: error.message
        });
    }
}