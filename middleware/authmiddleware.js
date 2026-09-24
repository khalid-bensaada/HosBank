
export function isAuthenticated(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.redirect("/auth/login");
    }

    next();
}

export default isAuthenticated;
