import mysql2 from "mysql2";
import dotenv from "dotenv";

//config dotenv 
dotenv.config();

export const pool = mysql2.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    named: process.env.DB_NAME
}).promise();