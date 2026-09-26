import { connection } from "../../config/database.js";

export async function renderVirementsPage(req, res) {
    try {
        return res.render('admin/virements');
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal server error");
    }
}

export async function getAllVirements(req, res) {
    try {
        const { search, statut } = req.query;

        let sql = `
            SELECT v.id, v.reference, v.montant, v.motif, v.statut, v.dateCreation,
                   cb.numeroCompte, u.nom, u.prenom,
                   b.nomComplet as beneficiaireNom, b.iban as beneficiaireIban
            FROM Virement v
            JOIN \`Compte bancaire\` cb ON v.compteSourceId = cb.id
            JOIN utilisateur u ON cb.clientId = u.id
            LEFT JOIN Bénéficiaire b ON v.beneficiaireId = b.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ` AND (v.reference LIKE ? OR u.nom LIKE ? OR u.prenom LIKE ? OR b.nomComplet LIKE ?)`;
            const term = `%${search}%`;
            params.push(term, term, term, term);
        }

        if (statut) {
            sql += ` AND v.statut = ?`;
            params.push(statut);
        }

        sql += ` ORDER BY v.dateCreation DESC`;

        const [virements] = await connection.query(sql, params);

        return res.status(200).json({ success: true, data: virements });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "something wrong here", error: error.message });
    }
}

export async function getVirementsStats(req, res) {
    try {
        const [totalResult] = await connection.query(`SELECT COUNT(*) as count FROM Virement`);
        const total = totalResult[0].count;

        const [termineResult] = await connection.query(
            `SELECT COUNT(*) as count FROM Virement WHERE statut = 'terminé'`
        );
        const termine = termineResult[0].count;

        const [totalMontantResult] = await connection.query(
            `SELECT SUM(montant) as total FROM Virement WHERE statut = 'terminé'`
        );
        const totalMontant = parseFloat(totalMontantResult[0].total) || 0;

        const [todayResult] = await connection.query(
            `SELECT COUNT(*) as count FROM Virement WHERE DATE(dateCreation) = CURDATE()`
        );
        const today = todayResult[0].count;

        return res.status(200).json({
            success: true,
            data: { total, termine, totalMontant, today }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "something wrong here", error: error.message });
    }
}

export async function renderVirementDetailsPage(req, res) {
    try {
        return res.render('admin/virement-details', {
            virementId: req.params.virementId
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal server error");
    }
}

export async function getVirementById(req, res) {
    try {
        const { virementId } = req.params;

        const [virements] = await connection.query(`
            SELECT v.*, cb.numeroCompte, u.nom, u.prenom, u.email,
                   b.nomComplet as beneficiaireNom, b.iban as beneficiaireIban, b.nomBanque
            FROM Virement v
            JOIN \`Compte bancaire\` cb ON v.compteSourceId = cb.id
            JOIN utilisateur u ON cb.clientId = u.id
            LEFT JOIN Bénéficiaire b ON v.beneficiaireId = b.id
            WHERE v.id = ?
        `, [virementId]);

        if (virements.length === 0) {
            return res.status(404).json({ message: 'Virement not found' });
        }

        return res.status(200).json({ success: true, data: virements[0] });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "something wrong here", error: error.message });
    }
}