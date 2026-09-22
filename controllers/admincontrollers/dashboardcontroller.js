import dayjs from "dayjs";
import {connection} from "../config/database.js";

export async function getDashboardStats(req ,res){
    try{

        if (!req.user) {
            return res.status(401).json({
                message: 'can not using this'
            });
        }

    }
    catch(error){

    }
}
