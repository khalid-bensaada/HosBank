
import { connection } from "../../config/database.js";


export async function renderUtilisateursPage(req, res) {
    try {
        return res.render('admin/utilisateurs');
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal server error");
    }
}


export async function getAllUtilisateurs(req, res) {
    try {
        const { search, statut, roleId } = req.query;

        let sql = `
            SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.statut, 
                   u.roleId, r.nom as roleName
            FROM utilisateur u
            JOIN role r ON u.roleId = r.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ` AND (u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (statut) {
            sql += ` AND u.statut = ?`;
            params.push(statut);
        }

        if (roleId) {
            sql += ` AND u.roleId = ?`;
            params.push(roleId);
        }

        sql += ` ORDER BY u.id DESC`;

        const [utilisateurs] = await connection.query(sql, params);

        return res.status(200).json({
            success: true,
            data: utilisateurs
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


export async function getUtilisateurById(req, res) {
    try {
        const { userId } = req.params;

        const [users] = await connection.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.adresse, 
                    u.statut, u.emailVerifie, u.roleId, r.nom as roleName
             FROM utilisateur u
             JOIN role r ON u.roleId = r.id
             WHERE u.id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilisateur not found' });
        }

        // récupérer aussi ses comptes bancaires
        const [comptes] = await connection.query(
            `SELECT id, numeroCompte, iban, typedecompte, solde, status
             FROM \`Compte bancaire\`
             WHERE clientId = ?`,
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: {
                ...users[0],
                comptes
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


export async function toggleUtilisateurStatus(req, res) {
    try {
        const { userId } = req.params;

        const [users] = await connection.query(
            `SELECT statut FROM utilisateur WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilisateur not found' });
        }

        const currentStatut = users[0].statut;
        const newStatut = currentStatut === 'actif' ? 'inactif' : 'actif';

        await connection.query(
            `UPDATE utilisateur SET statut = ? WHERE id = ?`,
            [newStatut, userId]
        );

        return res.status(200).json({
            success: true,
            message: `Utilisateur ${newStatut === 'actif' ? 'activé' : 'désactivé'} avec succès`,
            statut: newStatut
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


export async function updateUtilisateurRole(req, res) {
    try {
        const { userId } = req.params;
        const { roleId } = req.body;

        if (!roleId) {
            return res.status(400).json({ message: 'roleId is required' });
        }

        const [roles] = await connection.query(
            `SELECT id FROM role WHERE id = ?`,
            [roleId]
        );

        if (roles.length === 0) {
            return res.status(400).json({ message: 'Invalid roleId' });
        }

        const [users] = await connection.query(
            `SELECT id FROM utilisateur WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilisateur not found' });
        }

        await connection.query(
            `UPDATE utilisateur SET roleId = ? WHERE id = ?`,
            [roleId, userId]
        );

        return res.status(200).json({
            success: true,
            message: 'Rôle mis à jour avec succès'
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

export async function renderUtilisateurDetailsPage(req, res) {
    try {
        return res.render('admin/utilisateur-details', {
            userId: req.params.userId
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal server error");
    }
}


export async function getAllRoles(req, res) {
    try {
        const [roles] = await connection.query(`SELECT id, nom, description FROM role`);

        return res.status(200).json({
            success: true,
            data: roles
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