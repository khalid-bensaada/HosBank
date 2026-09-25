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

import {
    renderComptesPage,
    getAllComptes,
    getComptesStats,
    getCompteById,
    toggleCompteStatus
} from '../controllers/admincontrollers/comptecontroller.js';

import {
    renderCartesPage,
    renderCarteDetailsPage,
    getAllCartes,
    getCartesStats,
    getCarteById,
    toggleCarteStatus
} from '../controllers/admincontrollers/cartecontroller.js';

const router = express.Router();

// Dashboard
router.get('/dashboard', authMiddleware, isAdmin, renderAdminDashboard);
router.get('/api/dashboard/stats', authMiddleware, isAdmin, getDashboardStats);
router.get('/api/dashboard/recent-transactions', authMiddleware, isAdmin, getRecentTransactions);

// Utilisateurs
router.get('/utilisateurs', authMiddleware, isAdmin, renderUtilisateursPage);
router.get('/utilisateurs/:userId', authMiddleware, isAdmin, renderUtilisateurDetailsPage);
router.get('/api/utilisateurs', authMiddleware, isAdmin, getAllUtilisateurs);
router.get('/api/utilisateurs/:userId', authMiddleware, isAdmin, getUtilisateurById);
router.put('/api/utilisateurs/:userId/toggle-status', authMiddleware, isAdmin, toggleUtilisateurStatus);
router.put('/api/utilisateurs/:userId/role', authMiddleware, isAdmin, updateUtilisateurRole);
router.get('/api/roles', authMiddleware, isAdmin, getAllRoles);

// Comptes
router.get('/comptes', authMiddleware, isAdmin, renderComptesPage);
router.get('/api/comptes', authMiddleware, isAdmin, getAllComptes);
router.get('/api/comptes/stats', authMiddleware, isAdmin, getComptesStats);
router.get('/api/comptes/:compteId', authMiddleware, isAdmin, getCompteById);
router.put('/api/comptes/:compteId/toggle-status', authMiddleware, isAdmin, toggleCompteStatus);

// Cartes
router.get('/cartes', authMiddleware, isAdmin, renderCartesPage);
router.get('/cartes/:carteId', authMiddleware, isAdmin, renderCarteDetailsPage);
router.get('/api/cartes', authMiddleware, isAdmin, getAllCartes);
router.get('/api/cartes/stats', authMiddleware, isAdmin, getCartesStats);
router.get('/api/cartes/:carteId', authMiddleware, isAdmin, getCarteById);
router.put('/api/cartes/:carteId/toggle-status', authMiddleware, isAdmin, toggleCarteStatus);

export default router;