import { connection } from "../config/database.js";

export const stoppedMessage = "Your account is stopped.";

export function isUserActive(user) {
    return ["actif", "active"].includes(String(user.statut || "").trim().toLowerCase());
}

function rejectSession(req, res, api, stopped = false) {
    const respond = () => {
        res.clearCookie("connect.sid");
        if (api) {
            return res.status(stopped ? 403 : 401).json({ message: stopped ? stoppedMessage : "Please log in." });
        }
        return res.redirect(stopped ? "/auth/login?error=account-stopped" : "/auth/login");
    };
    if (req.session) {
        delete req.session.user;
        delete req.session.userId;
        return req.session.destroy(respond);
    }
    return respond();
}

async function authenticate(req, res, next, api) {
    const id = req.session?.user?.id || req.session?.userId;
    if (!id) {
        return api ? res.status(401).json({ message: "Please log in." }) : res.redirect("/auth/login");
    }
    try {
        const [users] = await connection.query(
            "SELECT id, nom, prenom, email, roleId, statut FROM utilisateur WHERE id = ?", [id]
        );
        const user = users[0];
        if (!user) return rejectSession(req, res, api);
        if (!isUserActive(user)) return rejectSession(req, res, api, true);
        user.roleId = Number(user.roleId);
        req.user = user;
        req.session.user = user;
        req.session.userId = user.id;
        return next();
    } catch (error) {
        return next(error);
    }
}

export function isAuthenticated(req, res, next) {
    return authenticate(req, res, next, false);
}

export function authMiddleware(req, res, next) {
    return authenticate(req, res, next, req.path.startsWith("/api/"));
}

export function isClient(req, res, next) {
    if (req.user?.roleId === 1) return next();
    if (req.user?.roleId === 2) return res.redirect("/admin/dashboard");
    return res.status(403).send("Access denied - Client only");
}
