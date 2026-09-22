import dayjs from "dayjs";
import {connection} from "../config/database.js";

export async function renderAdminDashboard(req ,res){

    try{

        if(!req.user){
            return res.redirect('/login');
        }

        return res.render('admin/dashboard', {
            title: 'Dashboard',
            user: req.user
        });
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message:  "something wrong here",
            error: error.message
        });
    }
}

export async function getDashboardStats(req ,res){
    try{

        if (!req.user) {
            return res.status(401).json({
                message: 'can not using this'
            });
        }

        const totalUsers = await User.count();

        const totalAccounts = await Account.count();

        const totalMoney = await Account.sum('balance') || 0;

        const startOfToday = dayjs().startOf('day').toDate();

        const todayVirments = await Transaction.count({
            where: {
                createdAt: {
                    [Op.gte]: startOfToday
                }
            }
        });

        const startOfMonth = dayjs().startOf('month').toDate();

        const monthVirments = await Transaction.count({
            where: {
                createdAt: {
                    [Op.gte]: startOfMonth
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalAccounts,
                totalMoney,
                todayVirments,
                monthVirments
            }
        });




    }
    catch(error){
        return res.status(500).json({
            success: false,
            message:  "something wrong here",
            error: error.message
        });
    }
}
