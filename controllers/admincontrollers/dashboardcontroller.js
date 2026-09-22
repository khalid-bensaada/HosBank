import dayjs from "dayjs";
import { connection } from "../../config/database.js";

export async function renderAdminDashboard(req, res) {
    try {
        if (!req.user) {
            return res.redirect('/login');
        }

        return res.render('admin/dashboard', {
            title: 'Dashboard',
            user: req.user
        });
    }
    catch (error) {
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
            return res.status(401).json({
                message: 'can not using this'
            });
        }

        const totalUsersResult = await connection('Utilisateur')
            .count('id as count')
            .first();
        const totalUsers = parseInt(totalUsersResult?.count) || 0;

        const totalAccountsResult = await connection('Compte bancaire')
            .count('id as count')
            .first();
        const totalAccounts = parseInt(totalAccountsResult?.count) || 0;

        const totalMoneyResult = await connection('Compte bancaire')
            .sum('solde as total')
            .first();
        const totalMoney = parseFloat(totalMoneyResult?.total) || 0;

        const startOfToday = dayjs().startOf('day').toDate();

        const todayVirementsResult = await connection('Virement')
            .where('dateCreation', '>=', startOfToday)
            .count('id as count')
            .first();
        const todayVirements = parseInt(todayVirementsResult?.count) || 0;

        const startOfMonth = dayjs().startOf('month').toDate();

        const monthVirementsResult = await connection('Virement')
            .where('dateCreation', '>=', startOfMonth)
            .count('id as count')
            .first();
        const monthVirements = parseInt(monthVirementsResult?.count) || 0;

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
        return res.status(500).json({
            success: false,
            message: "something wrong here",
            error: error.message
        });
    }
}