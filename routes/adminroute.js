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
    renderCompteDetailsPage,
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

import {
    renderVirementsPage,
    renderVirementDetailsPage,
    getAllVirements,
    getVirementsStats,
    getVirementById
} from '../controllers/admincontrollers/virementcontroller.js';

import {
    renderReclamationsPage,
    getAllReclamations,
    getReclamationsStats,
    getReclamationById,
    deleteReclamation
} from '../controllers/admincontrollers/reclamationcontroller.js';

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
router.get('/comptes/:compteId', authMiddleware, isAdmin, renderCompteDetailsPage);
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

// verments
router.get('/virements', authMiddleware, isAdmin, renderVirementsPage);
router.get('/virements/:virementId', authMiddleware, isAdmin, renderVirementDetailsPage);
router.get('/api/virements', authMiddleware, isAdmin, getAllVirements);
router.get('/api/virements/stats', authMiddleware, isAdmin, getVirementsStats);
router.get('/api/virements/:virementId', authMiddleware, isAdmin, getVirementById);

//reclamation
router.get('/reclamations', authMiddleware, isAdmin, renderReclamationsPage);
router.get('/api/reclamations', authMiddleware, isAdmin, getAllReclamations);
router.get('/api/reclamations/stats', authMiddleware, isAdmin, getReclamationsStats);
router.get('/api/reclamations/:reclamationId', authMiddleware, isAdmin, getReclamationById);
router.delete('/api/reclamations/:reclamationId', authMiddleware, isAdmin, deleteReclamation);

export default router;