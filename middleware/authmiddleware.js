export function authMiddleware(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'The Access is impossible' });
    }
    req.user = req.session.user;
    next();
}