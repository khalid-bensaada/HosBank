import express from "express";
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/isAdmin.js';
import {
    renderAdminDashboard,
    getDashboardStats,
    getRecentTransactions
} from '../controllers/admincontrollers/dashboardcontroller.js';
import {
    renderUtilisateursPage,
    renderUtilisateurDetailsPage,
    getAllUtilisateurs,
    getUtilisateurById,
    toggleUtilisateurStatus,
    updateUtilisateurRole,
    getAllRoles
} from '../controllers/admincontrollers/utilisateurcontroller.js';

const router = express.Router();

router.get('/dashboard', authMiddleware, isAdmin, renderAdminDashboard);
router.get('/api/dashboard/stats', authMiddleware, isAdmin, getDashboardStats);
router.get('/api/dashboard/recent-transactions', authMiddleware, isAdmin, getRecentTransactions);

router.get('/utilisateurs', authMiddleware, isAdmin, renderUtilisateursPage);
router.get('/utilisateurs/:userId', authMiddleware, isAdmin, renderUtilisateurDetailsPage);
router.get('/api/utilisateurs', authMiddleware, isAdmin, getAllUtilisateurs);
router.get('/api/utilisateurs/:userId', authMiddleware, isAdmin, getUtilisateurById);
router.put('/api/utilisateurs/:userId/toggle-status', authMiddleware, isAdmin, toggleUtilisateurStatus);
router.put('/api/utilisateurs/:userId/role', authMiddleware, isAdmin, updateUtilisateurRole);
router.get('/api/roles', authMiddleware, isAdmin, getAllRoles);

export default router;