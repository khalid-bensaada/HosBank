import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ejs from "ejs";
import { executeVirement } from "../controllers/clientcontrollers/virementcontroller.js";
import { isAuthenticated } from "../middleware/authmiddleware.js";

test("every navbar destination has a route", async () => {
    const navbar = await readFile("views/components/navbar.ejs", "utf8");
    const routes = await readFile("routes/dashboardroute.js", "utf8");
    for (const match of navbar.matchAll(/href: "\/dashboard([^\"]*)"/g)) {
        assert.ok(routes.includes(`router.get("${match[1] || "/"}"`));
    }
});

test("new pages render empty states and active navigation", async () => {
    for (const [view, data] of [["history", { transactions: [] }], ["cards", { cards: [] }]]) {
        const html = await ejs.renderFile(`views/clients/${view}.ejs`, data);
        assert.match(html, /aria-current="page"/);
        assert.ok(html.includes("Aucune"));
    }
});

test("transaction amounts render and user text is escaped", async () => {
    const html = await ejs.renderFile("views/components/transactions.ejs", {
        transactions: [{ type: "VIREMENT_RECU", amount: "12.50", created_at: new Date(),
            description: "<script>alert(1)</script>", reference: "VIR-1", destinationNumero: "HOS-1" }]
    });
    assert.ok(html.includes("+12.50 MAD"));
    assert.ok(!html.includes("<script>"));
});

test("invalid transfer amounts are rejected before database access", async () => {
    for (const montant of ["12abc", "Infinity", "0", "-1", "1.001", "1e3"]) {
        let redirect;
        await executeVirement({ session: { userId: 42 }, body: { compteSourceId: "1", montant } },
            { redirect(url) { redirect = url; } });
        assert.ok(redirect.includes("montant-invalide"));
    }
});

test("anonymous users are redirected to login", () => {
    let redirect;
    isAuthenticated({}, { redirect(url) { redirect = url; } }, () => assert.fail("Access allowed"));
    assert.equal(redirect, "/auth/login");
});
