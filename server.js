require('dotenv').config();

const express = require('express');
const path = require('path');
const mysql = require('mysql');
const server = express();
const bodyparser = require('body-parser');
const session = require('express-session');
const { send } = require('process');

const serverPort = process.env.PORT || 3000;

// Database connection
const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DBNAME
});

// Initial setup
server.use(bodyparser.urlencoded({ extended: true }));
server.use(express.urlencoded({extended: true}));
server.use(express.json());
server.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));
server.use(express.static(path.join(__dirname, 'Public')));

//Initial route
server.get('/', (req, res) => {
    if(req.session.loggedIn){
        res.redirect('/NadzornaPlosca');
    }else{
        res.redirect('/login');
    }
});

// Login/Logout routes
server.get('/login', async (req, res) => {
        res.sendFile(path.join(__dirname,"Public","login.html"));
});

server.post('/login', async (req, res) => {
    const UporabniskoIme = req.body.UporabniskoIme;
    const UporabniskoGeslo = req.body.UporabniskoGeslo;
    const result = await SQLquery(`SELECT * FROM UporabnikiUKM LEFT JOIN Vloga ON UporabnikiUKM.OznakaVloge = Vloga.OznakaVloge WHERE UporabniskoIme = ? AND Geslo = ?`, [UporabniskoIme, UporabniskoGeslo]);
    if(result.length > 0){
        req.session.UporabniskoIme = UporabniskoIme;
        req.session.Ime = result[0].Ime;
        req.session.Priimek = result[0].Priimek;
        req.session.OznakaVloge = result[0].OznakaVloge;
        req.session.D_Pregledopreme = result[0].PregledOpreme;
        req.session.D_DodajanjeOpreme = result[0].DodajanjeOpreme;
        req.session.D_UrejanjeOpreme = result[0].UrejanjeOpreme;
        req.session.D_BrisanjeOpreme = result[0].BrisanjeOpreme;
        req.session.D_UrejanjeUporabnikov = result[0].UrejanjeUporabnikov;
        req.session.D_OgledNadzornePlosce = result[0].OgledNadzornePlosce;
        req.session.loggedIn = true;
        console.log(`User ${UporabniskoIme} logged in.`);
        console.log(req.session);
        console.log(result);
        res.redirect('/nadzornaPlosca');
    }else{
        res.redirect('/login');
    }
});

server.post('/logout', async (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Routes

// Data routes
server.get('/delovnePostajePodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme){
        const result = await SQLquery(`SELECT * FROM DelovnaPostaja`);
        res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

// HTML routes
server.get('/nadzornaPlosca', async (req, res) => {
    res.sendFile(path.join(__dirname,"Public","/HTML/index.html"));
});

// User data route
server.post('/uporabnikPodatki', async (req, res) => {
    if(req.session.loggedIn){
        res.json({
            "UporabniskoIme": req.session.UporabniskoIme,
            "Ime": req.session.Ime,
            "Priimek": req.session.Priimek,
            "OznakaVloge": req.session.OznakaVloge,
            "D_PregledOpreme": req.session.D_Pregledopreme,
            "D_DodajanjeOpreme": req.session.D_DodajanjeOpreme,
            "D_UrejanjeOpreme": req.session.D_UrejanjeOpreme,
            "D_BrisanjeOpreme": req.session.D_BrisanjeOpreme,
            "D_UrejanjeUporabnikov": req.session.D_UrejanjeUporabnikov,
            "D_OgledNadzornePlosce": req.session.D_OgledNadzornePlosce
        });
    }else{
        res.status(401).json({error: 'Not authenticated'});
    }
});

// Start server
server.listen(serverPort, () => {
    console.log(`Server running at http://localhost:${serverPort}/`);
});

// SQL query function
function SQLquery(SQLquery, params=[]) {
    return new Promise((resolve, reject) => {
        pool.query(SQLquery, params, (err, results) => {
            if (err){
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}