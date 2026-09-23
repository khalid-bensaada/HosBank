import express from "express";

import authRoutes from "./routes/authroute.js";
import adminRoutes from "./routes/adminroute.js";


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

app.use("/admin", adminRoutes);

export default app;