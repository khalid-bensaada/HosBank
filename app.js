import express from "express";

import authRoutes from "./routes/authroute.js";


const app = express();


app.set("view engine", "ejs");


app.use(express.urlencoded({
    extended: true
}));


app.use(express.json());


app.use(
    "/auth",
    authRoutes
);

app.get("/", (req, res) => {
    res.send("Bienvenue sur HosBank !");
});


export default app;