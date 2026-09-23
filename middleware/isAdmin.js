export function isAdmin(req, res, next) {
    if (!req.user || req.user.roleId !== 2) {
        return res.status(403).json({ message: 'Access denied - Admin only' });
    }
    next();
}