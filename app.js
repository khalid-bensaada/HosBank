import express from "express";
import session from "express-session";

import authRoutes from "./routes/authroute.js";
import dashboardRoutes from "./routes/dashboardroute.js";


const app = express();


app.set("view engine", "ejs");


app.use(express.urlencoded({
    extended: true
}));


app.use(express.json());

app.use(session({
    secret: "hosbank-secret",
    resave: false,
    saveUninitialized: false
}));


app.use(
    "/auth",
    authRoutes
);

app.use(
    "/dashboard",
    dashboardRoutes
);

app.get("/", (req, res) => {
    res.render("home");
});


export default app;
