import { connection } from "../../config/database.js";

// Show outgoing transfers and incoming transfers between the client's accounts.
export async function loadHistory(userId, limit = 100) {
    const [transactions] = await connection.query(
        `SELECT t.*, source.numeroCompte AS sourceNumero,
                destination.numeroCompte AS destinationNumero
         FROM transactions t
         JOIN compte_bancaire source ON source.id = t.from_account_id
         LEFT JOIN compte_bancaire destination ON destination.id = t.to_account_id
         WHERE (t.type = 'VIREMENT_EMIS' AND source.clientId = ?)
            OR (t.type = 'VIREMENT_RECU' AND destination.clientId = ?)
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT ?`,
        [userId, userId, limit]
    );
    return transactions;
}

export async function showHistory(req, res) {
    try {
        const transactions = await loadHistory(req.session.userId);
        return res.render("clients/history", { transactions });
    } catch (error) {
        console.error("Error loading history:", error);
        return res.status(500).render("clients/error");
    }
}

export async function showCards(req, res) {
    try {
        const [cards] = await connection.query(
            `SELECT RIGHT(c.numerodeCart, 4) AS lastDigits, c.dateExperation,
                    c.typeCarte, c.status, a.numeroCompte
             FROM \`Carte bancaire\` c
             JOIN compte_bancaire a ON a.id = c.compteId
             WHERE a.clientId = ?
             ORDER BY c.dateCreation DESC`,
            [req.session.userId]
        );
        return res.render("clients/cards", { cards });
    } catch (error) {
        console.error("Error loading cards:", error);
        return res.status(500).render("clients/error");
    }
}
