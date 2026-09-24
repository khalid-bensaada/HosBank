
import dayjs from "dayjs";
import { connection } from "../../config/database.js";

export async function renderAdminDashboard(req, res) {
    try {
        if (!req.user) {
            return res.redirect('/auth/login');
        }

        return res.render('admin/dashboard', {
            title: 'Dashboard',
            user: req.user
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "something wrong here",
            error: error.message
        });
    }
}

export async function getDashboardStats(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'can not using this' });
        }

        const [usersResult] = await connection.query(
            `SELECT COUNT(*) as count FROM utilisateur`
        );
        const totalUsers = usersResult[0].count;

        const [accountsResult] = await connection.query(
            `SELECT COUNT(*) as count FROM \`Compte bancaire\``
        );
        const totalAccounts = accountsResult[0].count;

        const [moneyResult] = await connection.query(
            `SELECT SUM(solde) as total FROM \`Compte bancaire\``
        );
        const totalMoney = parseFloat(moneyResult[0].total) || 0;

        const [todayVirementsResult] = await connection.query(
            `SELECT COUNT(*) as count FROM Virement WHERE DATE(dateCreation) = CURDATE()`
        );
        const todayVirements = todayVirementsResult[0].count;

        const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
        const [monthVirementsResult] = await connection.query(
            `SELECT COUNT(*) as count FROM Virement WHERE dateCreation >= ?`,
            [startOfMonth]
        );
        const monthVirements = monthVirementsResult[0].count;

        return res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalAccounts,
                totalMoney,
                todayVirements,
                monthVirements
            }
        });

    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "something wrong here",
            error: error.message
        });
    }
}

export async function getRecentTransactions(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'can not using this' });
        }

        const [transactions] = await connection.query(`
            SELECT o.*, u.nom, u.prenom, cb.iban
            FROM Opération o
            JOIN \`Compte bancaire\` cb ON o.compteId = cb.id
            JOIN utilisateur u ON cb.clientId = u.id
            ORDER BY o.dateOperation DESC
            LIMIT 5
        `);

        const formatted = transactions.map(t => ({
            ...t,
            nomComplet: `${t.nom} ${t.prenom}`,
            iban: t.iban
        }));

        return res.status(200).json({
            success: true,
            data: formatted
        });

    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "something wrong here",
            error: error.message
        });
    }
}