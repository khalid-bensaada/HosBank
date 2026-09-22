
import { connection } from "../../config/database.js";

// GET
export async function renderBeneficiairesPage(req, res) {
    try {
        return res.render('clients/beneficiaires');
    } catch (error) {
        console.error('Error rendering beneficiaires page', error);
        return res.status(500).send('Internal server error');
    }
}

// GET
export async function getBeneficiaires(req, res) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        const beneficiaires = await connection('Bénéficiaire as b')
            .leftJoin(
                connection('Virement')
                    .select('beneficiaireId')
                    .max('dateCreation as lastDate')
                    .groupBy('beneficiaireId')
                    .as('lastVir'),
                'b.id', 'lastVir.beneficiaireId'
            )
            .leftJoin('Virement as v', function () {
                this.on('v.beneficiaireId', '=', 'b.id')
                    .andOn('v.dateCreation', '=', 'lastVir.lastDate');
            })
            .where('b.clientId', userId)
            .select(
                'b.id',
                'b.nomComplet',
                'b.iban',
                'b.nomBanque',
                'b.statut',
                'b.dateAjout',
                'v.montant as dernierMontant',
                'v.dateCreation as dernierVirementDate'
            )
            .orderBy('b.dateAjout', 'desc');

        return res.status(200).json({ beneficiaires });

    } catch (error) {
        console.error('Error about get beneficiaires', error);
        return res.status(500).json({ message: 'error in server' });
    }
}

// GET
export async function getBeneficiairesStats(req, res) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        const activeCountResult = await connection('Bénéficiaire')
            .where({ clientId: userId, statut: 'actif' })
            .count('id as count')
            .first();

        const activeCount = parseInt(activeCountResult?.count) || 0;

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const virementsSumResult = await connection('Virement as v')
            .join('Compte bancaire as c', 'v.compteSourceId', '=', 'c.id')
            .where('c.clientId', userId)
            .andWhere('v.dateCreation', '>=', firstDayOfMonth)
            .sum('v.montant as total')
            .first();

        const virementsThisMonth = parseFloat(virementsSumResult?.total) || 0;

        return res.status(200).json({
            beneficiairesActifs: activeCount,
            virementsCeMois: virementsThisMonth
        });

    } catch (error) {
        console.error('Error about get beneficiaires stats', error);
        return res.status(500).json({ message: 'error in server' });
    }
}

// POST
export async function createBeneficiaire(req, res) {
    try {
        const userId = req.user?.id;
        const { nomComplet, iban, nomBanque } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        if (!nomComplet || !iban) {
            return res.status(400).json({ message: 'nomComplet and iban are required' });
        }

        const existing = await connection('Bénéficiaire')
            .where({ clientId: userId, iban })
            .first();

        if (existing) {
            return res.status(409).json({ message: 'Beneficiaire with this IBAN already exists' });
        }

        const [beneficiaireId] = await connection('Bénéficiaire').insert({
            nomComplet,
            iban,
            nomBanque: nomBanque || null,
            statut: 'actif',
            clientId: userId
        });

        return res.status(201).json({
            message: 'Beneficiaire created successfully',
            beneficiaire: { id: beneficiaireId, nomComplet, iban, nomBanque: nomBanque || null, statut: 'actif' }
        });

    } catch (error) {
        console.error('Error creating beneficiaire', error);
        return res.status(500).json({ message: 'error in server' });
    }
}

// PUT
export async function updateBeneficiaire(req, res) {
    try {
        const userId = req.user?.id;
        const { beneficiaireId } = req.params;
        const { nomComplet, iban, nomBanque, statut } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        const beneficiaire = await connection('Bénéficiaire')
            .where({ id: beneficiaireId, clientId: userId })
            .first();

        if (!beneficiaire) {
            return res.status(404).json({ message: 'Beneficiaire not found or access denied' });
        }

        const updateData = {};
        if (nomComplet) updateData.nomComplet = nomComplet;
        if (iban) updateData.iban = iban;
        if (nomBanque !== undefined) updateData.nomBanque = nomBanque;
        if (statut) updateData.statut = statut;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        await connection('Bénéficiaire')
            .where({ id: beneficiaireId })
            .update(updateData);

        return res.status(200).json({ message: 'Beneficiaire updated successfully' });

    } catch (error) {
        console.error('Error updating beneficiaire', error);
        return res.status(500).json({ message: 'error in server' });
    }
}

// DELETE
export async function deleteBeneficiaire(req, res) {
    try {
        const userId = req.user?.id;
        const { beneficiaireId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        const beneficiaire = await connection('Bénéficiaire')
            .where({ id: beneficiaireId, clientId: userId })
            .first();

        if (!beneficiaire) {
            return res.status(404).json({ message: 'Beneficiaire not found or access denied' });
        }

        const linkedVirement = await connection('Virement')
            .where({ beneficiaireId })
            .first();

        if (linkedVirement) {
            await connection('Bénéficiaire')
                .where({ id: beneficiaireId })
                .update({ statut: 'inactif' });

            return res.status(200).json({
                message: 'Beneficiaire has virement history, marked as inactive instead of deleted'
            });
        }

        await connection('Bénéficiaire')
            .where({ id: beneficiaireId })
            .del();

        return res.status(200).json({ message: 'Beneficiaire deleted successfully' });

    } catch (error) {
        console.error('Error deleting beneficiaire', error);
        return res.status(500).json({ message: 'error in server' });
    }
}