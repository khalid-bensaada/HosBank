import { connection } from "../../config/database.js";


export async function renderReclamationsPage(req, res) {
    try {
        return res.render('admin/reclamations');
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal server error");
    }
}


export async function getAllReclamations(req, res) {
    try {
        const { search } = req.query;

        let sql = `
            SELECT r.id, r.sujet, r.description, r.utilisateurId,
                   u.nom, u.prenom, u.email
            FROM Réclamation r
            JOIN utilisateur u ON r.utilisateurId = u.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ` AND (r.sujet LIKE ? OR u.nom LIKE ? OR u.prenom LIKE ?)`;
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        sql += ` ORDER BY r.id DESC`;

        const [reclamations] = await connection.query(sql, params);

        return res.status(200).json({ success: true, data: reclamations });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "something wrong here", error: error.message });
    }
}


export async function getReclamationsStats(req, res) {
    try {
        const [totalResult] = await connection.query(
            `SELECT COUNT(*) as count FROM Réclamation`
        );
        const total = totalResult[0].count;

        return res.status(200).json({
            success: true,
            data: { total }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "something wrong here", error: error.message });
    }
}


export async function getReclamationById(req, res) {
    try {
        const { reclamationId } = req.params;

        const [reclamations] = await connection.query(
            `SELECT r.*, u.nom, u.prenom, u.email, u.telephone
             FROM Réclamation r
             JOIN utilisateur u ON r.utilisateurId = u.id
             WHERE r.id = ?`,
            [reclamationId]
        );

        if (reclamations.length === 0) {
            return res.status(404).json({ message: 'Réclamation not found' });
        }

        return res.status(200).json({ success: true, data: reclamations[0] });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "something wrong here", error: error.message });
    }
}


export async function deleteReclamation(req, res) {
    try {
        const { reclamationId } = req.params;

        const [reclamations] = await connection.query(
            `SELECT id FROM Réclamation WHERE id = ?`,
            [reclamationId]
        );

        if (reclamations.length === 0) {
            return res.status(404).json({ message: 'Réclamation not found' });
        }

        await connection.query(
            `DELETE FROM Réclamation WHERE id = ?`,
            [reclamationId]
        );

        return res.status(200).json({ success: true, message: 'Réclamation supprimée avec succès' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "something wrong here", error: error.message });
    }
}