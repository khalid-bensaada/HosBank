import {connection} from "../config/database.js";

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