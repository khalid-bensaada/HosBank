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


