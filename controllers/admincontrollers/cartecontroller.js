
import { connection } from "../../config/database.js";


export async function renderCartesPage(req, res) {
    try {
        return res.render('admin/cartes');
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal server error");
    }
}


export async function getAllCartes(req, res) {
    try {
        const { search, type, status } = req.query;

        let sql = `
            SELECT cc.id, cc.numerodeCart, cc.dateExperation, cc.typeCarte, 
                   cc.status, cc.dateCreation, cc.compteId,
                   cb.numeroCompte, u.nom, u.prenom
            FROM \`Carte bancaire\` cc
            JOIN \`Compte bancaire\` cb ON cc.compteId = cb.id
            JOIN utilisateur u ON cb.clientId = u.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ` AND (cc.numerodeCart LIKE ? OR u.nom LIKE ? OR u.prenom LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (type) {
            sql += ` AND cc.typeCarte = ?`;
            params.push(type);
        }

        if (status) {
            sql += ` AND cc.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY cc.id DESC`;

        const [cartes] = await connection.query(sql, params);


        const masked = cartes.map(c => ({
            ...c,
            numerodeCartMasked: '**** **** **** ' + c.numerodeCart.slice(-4)
        }));

        return res.status(200).json({
            success: true,
            data: masked
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


export async function getCartesStats(req, res) {
    try {
        const [totalResult] = await connection.query(
            `SELECT COUNT(*) as count FROM \`Carte bancaire\``
        );
        const total = totalResult[0].count;

        const [physiqueResult] = await connection.query(
            `SELECT COUNT(*) as count FROM \`Carte bancaire\` WHERE typeCarte = 'PHYSIQUE'`
        );
        const physique = physiqueResult[0].count;

        const [virtuelleResult] = await connection.query(
            `SELECT COUNT(*) as count FROM \`Carte bancaire\` WHERE typeCarte = 'VIRTUELLE'`
        );
        const virtuelle = virtuelleResult[0].count;

        const [bloqueesResult] = await connection.query(
            `SELECT COUNT(*) as count FROM \`Carte bancaire\` WHERE status = 'bloquée'`
        );
        const bloquees = bloqueesResult[0].count;

        return res.status(200).json({
            success: true,
            data: { total, physique, virtuelle, bloquees }
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


export async function getCarteById(req, res) {
    try {
        const { carteId } = req.params;

        const [cartes] = await connection.query(
            `SELECT cc.*, cb.numeroCompte, cb.iban, u.nom, u.prenom, u.email
             FROM \`Carte bancaire\` cc
             JOIN \`Compte bancaire\` cb ON cc.compteId = cb.id
             JOIN utilisateur u ON cb.clientId = u.id
             WHERE cc.id = ?`,
            [carteId]
        );

        if (cartes.length === 0) {
            return res.status(404).json({ message: 'Carte not found' });
        }

        return res.status(200).json({
            success: true,
            data: cartes[0]
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

export async function renderCarteDetailsPage(req, res) {
    try {
        return res.render('admin/carte-details', {
            carteId: req.params.carteId
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal server error");
    }
}

export async function toggleCarteStatus(req, res) {
    try {
        const { carteId } = req.params;

        const [cartes] = await connection.query(
            `SELECT status FROM \`Carte bancaire\` WHERE id = ?`,
            [carteId]
        );

        if (cartes.length === 0) {
            return res.status(404).json({ message: 'Carte not found' });
        }

        const currentStatus = cartes[0].status;
        const newStatus = currentStatus === 'active' ? 'bloquée' : 'active';

        await connection.query(
            `UPDATE \`Carte bancaire\` SET status = ? WHERE id = ?`,
            [newStatus, carteId]
        );

        return res.status(200).json({
            success: true,
            message: `Carte ${newStatus === 'active' ? 'débloquée' : 'bloquée'} avec succès`,
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