import {connection} from "../config/database.js";
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';

export async function getUserInfo(req , res){

    try{

        const userId = req.user?.id;

        if(!userId) {
            return res.status(401).json({message: 'The Access is impossible'});
        }

        const user = await connection('utilisateur')
            .select('nom','prenom')
            .where({ id: userId })

        if(!user){
            return res.status(404).json({ message: 'undefined User'});
        }

        return res.status(200).json({
            nom: user.nom,
            prenom: user.prenom
        });
    }
    catch (error){
        console.error('Error about get user',error);
        return res.status(500).json({ message: 'error in server'});
    }
};

export async function getComptes(req, res){

    try{
        const userId = req.user?.id;

        if(!userId) {
            return res.status(401).json({message: 'The Access is impossible'});
        }

        const comptes = await connection('Compte bancaire')
            .select('numeroCompte', 'iban', 'typedecompte', 'solde')
            .where({ clientId: userId });

        return res.status(200).json(comptes)
    }
    catch (error){

        console.error('Error about get user',error);
        return res.status(500).json({ message: 'error in server'});

    }
};

export async function getPatrimoineTotal(req, res){

    try{

        const userId = req.user?.id;

        if(!userId) {
            return res.status(401).json({message: 'The Access is impossible'});
        }

        const result = await connection('Compte bancaire')
            .where({ clientId: userId })
            .sum('solde as total');

        const total = parseFloat(result[0]?.total) || 0;

        return res.status(200).json({
            patrimoineTotal: total
        });
    }
    catch (error){

        console.error('Error about get user',error);
        return res.status(500).json({ message: 'error in server'});
    }
};

export async function getRecentOperations(req, res) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        // get last 6 opérations
        const operations = await connection('Opération')
            .join('Compte bancaire', 'Opération.compteId', '=', 'Compte bancaire.id')
            .where('Compte bancaire.clientId', userId)
            .select(
                'Opération.*',
                'Compte bancaire.numeroCompte'
            )
            .orderBy('Opération.dateOperation', 'desc')
            .limit(6);


        const categorizedOperations = operations.map(operation => {
            return {
                ...operation,
                category: categorizeOperation(operation)
            };
        });

        return res.status(200).json({
            operations: categorizedOperations
        });

    } catch (error) {

        console.error('Error about get user operations', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

export async function getOperationDetails(req, res) {
    try {
        const userId = req.user?.id;
        const { operationId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        if (!operationId) {
            return res.status(400).json({ message: 'Operation ID is required' });
        }


        const operation = await connection('Opération')
            .join('Compte bancaire', 'Opération.compteId', '=', 'Compte bancaire.id')
            .where({
                'Opération.id': operationId,
                'Compte bancaire.clientId': userId
            })
            .select(
                'Opération.*',
                'Compte bancaire.numeroCompte',
                'Compte bancaire.typedecompte'
            )
            .first();


        if (!operation) {
            return res.status(404).json({ message: 'Operation not found or access denied' });
        }

        return res.status(200).json({
            operation
        });

    } catch (error) {

        console.error('Error about get operation details', error);
        return res.status(500).json({ message: 'error in server' });
    }
};


export async function createVirement(req, res) {
    try {

        const userId = req.user?.id;
        const { compteSourceId, beneficiaireId, montant, motif } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        // verify if inputs is empty
        const numericMontant = parseFloat(montant);
        if (!compteSourceId || !beneficiaireId || isNaN(numericMontant) || numericMontant <= 0) {
            return res.status(400).json({ message: 'Invalid inputs or montant must be greater than 0' });
        }


        const result = await connection.transaction(async (trx) => {

            // verify user
            const compteSource = await trx('Compte bancaire')
                .where({ id: compteSourceId, clientId: userId })
                .select('solde')
                .first();

            if (!compteSource) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }

            const soldeAvant = parseFloat(compteSource.solde);

            // verify sold if is enought

            if (soldeAvant < numericMontant) {
                throw new Error('INSUFFICIENT_FUNDS');
            }

            const soldeApres = soldeAvant - numericMontant;
            const reference = `VIR-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;


            await trx('Compte bancaire')
                .where({ id: compteSourceId })
                .update({ solde: soldeApres });


            const [virementId] = await trx('Virement').insert({
                compteSourceId,
                beneficiaireId,
                montant: numericMontant,
                motif: motif || '',
                reference,
                dateVirement: new Date()
            });


            await trx('Opération').insert({
                compteId: compteSourceId,
                type: 'VIREMENT',
                montant: -numericMontant,
                soldeAvant,
                soldeApres,
                reference,
                dateOperation: new Date()
            });

            return { reference, virementId, soldeApres };
        });


        return res.status(200).json({
            message: 'Virement executed successfully',
            reference: result.reference,
            newSolde: result.soldeApres
        });

    } catch (error) {

        if (error.message === 'ACCOUNT_NOT_FOUND') {
            return res.status(404).json({ message: 'Source account not found or access denied' });
        }
        if (error.message === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ message: 'Solde insuffisant pour effectuer le virement' });
        }

        console.error('Error executing virement', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

export async function createCarteVirtuelle(req, res) {
    try {
        const userId = req.user?.id;
        const { compteId } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        if (!compteId) {
            return res.status(400).json({ message: 'Compte ID is required' });
        }

        // check user
        const compte = await connection('Compte bancaire')
            .where({ id: compteId, clientId: userId })
            .first();

        if (!compte) {
            return res.status(404).json({ message: 'Account not found or access denied' });
        }

        // add the card with 3 random numbers
        const numeroCarte = generateCardNumber();
        const cvv = Math.floor(100 + Math.random() * 900).toString();

        const dateExpiration = new Date();
        // add 3 years to card
        dateExpiration.setFullYear(dateExpiration.getFullYear() + 3);


        const newCard = {
            compteId,
            numeroCarte,
            cvv,
            dateExpiration,
            type: 'VIRTUELLE',
            isBlocked: false,
            createdAt: new Date()
        };

        const [carteId] = await connection('Carte bancaire').insert(newCard);


        return res.status(201).json({
            message: 'Virtual card created successfully',
            carte: {
                id: carteId,
                ...newCard
            }
        });

    } catch (error) {

        console.error('Error creating virtual card', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

export async function downloadRib(req, res) {
    try {
        const userId = req.user?.id;
        const { compteId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'The Access is impossible' });
        }

        if (!compteId) {
            return res.status(400).json({ message: 'Compte ID is required' });
        }


        const data = await connection('Compte bancaire')
            .join('Utilisateurs', 'Compte bancaire.clientId', '=', 'Utilisateurs.id')
            .where({
                'Compte bancaire.id': compteId,
                'Compte bancaire.clientId': userId
            })
            .select(
                'Compte bancaire.iban',
                'Compte bancaire.numeroCompte',
                'Compte bancaire.typedecompte',
                'Utilisateurs.nom',
                'Utilisateurs.prenom'
            )
            .first();

        if (!data) {
            return res.status(404).json({ message: 'Account not found or access denied' });
        }


        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=RIB_${data.numeroCompte}.pdf`);


        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);


        doc.fontSize(20).text('Relevé d Identity Bancaire (RIB)', { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(12).text(`Titulaire du compte: ${data.nom} ${data.prenom}`);
        doc.text(`Type de compte: ${data.typedecompte}`);
        doc.moveDown();

        doc.fontSize(14).text('Informations Bancaires:', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Numéro de Compte: ${data.numeroCompte}`);
        doc.text(`IBAN: ${data.iban}`);
        doc.moveDown(2);

        doc.fontSize(10).text('Document généré automatiquement par le système bancaire.', { align: 'center', italic: true });


        doc.end();

    } catch (error) {

        console.error('Error downloading RIB', error);
        return res.status(500).json({ message: 'error in server' });
    }
};

