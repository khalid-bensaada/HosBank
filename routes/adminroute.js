import express from "express";
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/isAdmin.js';
import {
    renderAdminDashboard,
    getDashboardStats
} from '../controllers/admincontrollers/dashboardcontroller.js';

const router = express.Router();

router.get('/dashboard', authMiddleware, isAdmin, renderAdminDashboard);
router.get('/api/dashboard/stats', authMiddleware, isAdmin, getDashboardStats);

export default router;