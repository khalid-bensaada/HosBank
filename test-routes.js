import { connection } from "./config/database.js";
import { executeVirement } from "./controllers/clientcontrollers/virementcontroller.js";

async function testVirement() {
    try {
        console.log("=== Testing executeVirement with user 13 ===");
        const [comptes] = await connection.query("SELECT id, typedecompte, solde FROM `compte_bancaire` WHERE clientId = 13");
        console.log("User 13 accounts before transfer:", comptes);

        const courant = comptes.find(c => c.typedecompte.toUpperCase() === "COURANT");
        const epargne = comptes.find(c => c.typedecompte.toUpperCase() === "EPARGNE");

        if (!courant || !epargne) {
            console.log("Both accounts not found for user 13");
            return;
        }
    

        const mockReq = {
            session: { userId: 13 },
            body: {
                compteSourceId: courant.id,
                typeDestinataire: "interne",
                compteDestId: epargne.id,
                montant: "10.00",
                motif: "Test virement interne HosBank"
            }
        };

        let redirectedUrl = "";
        const mockRes = {
            redirect: (url) => {
                redirectedUrl = url;
                console.log("executeVirement redirected to:", url);
            }
        };

        await executeVirement(mockReq, mockRes);

        const [comptesAfter] = await connection.query("SELECT id, typedecompte, solde FROM `compte_bancaire` WHERE clientId = 13");
        console.log("User 13 accounts after transfer:", comptesAfter);

        // Check if virement row exists
        const [virements] = await connection.query("SELECT * FROM virement WHERE compteSourceId = ? ORDER BY id DESC LIMIT 1", [courant.id]);
        console.log("Last virement created:", virements[0]);

        // Revert the 10 MAD test transfer so balances stay untouched
        await connection.query("UPDATE `compte_bancaire` SET solde = solde + 10 WHERE id = ?", [courant.id]);
        await connection.query("UPDATE `compte_bancaire` SET solde = solde - 10 WHERE id = ?", [epargne.id]);
        if (virements.length > 0) {
            await connection.query("DELETE FROM virement WHERE id = ?", [virements[0].id]);
        }
        await connection.query("DELETE FROM transactions WHERE description = 'Test virement interne HosBank'");
        console.log("Cleaned up test virement successfully!");

    } catch (err) {
        console.error("Error testing virement:", err);
    } finally {
        process.exit(0);
    }
}

testVirement();
