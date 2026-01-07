const express = require('express');
const path = require('path');
const mysql = require('mysql');
const server = express();
const bodyparser = require('body-parser');
const session = require('express-session');
const { send } = require('process');

const port = 3000;

// Database connection
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'sql7.freesqldatabase.com',
    user: 'sql7812723',
    password: 'WLcNYgwsrr',
    database: 'sql7812723'
});

// Initial setup
server.use(bodyparser.urlencoded({ extended: true }));
server.use(express.urlencoded({extended: true}));
server.use(express.json());
server.use(session({
    secret: '!#SecretKeyUKM2025#!',
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
    let UporabniskoIme = req.body.UporabniskoIme;
    let UporabniskoGeslo = req.body.UporabniskoGeslo;
    let result = await SQLquery(`SELECT * FROM UporabnikiUKM LEFT JOIN Vloga ON UporabnikiUKM.OznakaVloge = Vloga.OznakaVloge WHERE UporabniskoIme = '${UporabniskoIme}' AND Geslo = '${UporabniskoGeslo}'`);
    if(result.length > 0){
        req.session.UporabniskoIme = UporabniskoIme;
        req.session.Ime = result[0].Ime;
        req.session.Priimek = result[0].Priimek;
        req.session.oznakaVloge = result[0].OznakaVloge;
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
        res.redirect('/NadzornaPlosca');
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
server.get('/NadzornaPlosca', async (req, res) => {
    res.sendFile(path.join(__dirname,"Public","/HTML/index.html"));
});

// HTML routes

// User data route
server.post('/uporabnikPodatki', async (req, res) => {
    if(req.session.loggedIn){
        res.send({"UporabniskoIme": req.session.UporabniskoIme,
                  "Ime": req.session.Ime,
                  "Priimek": req.session.Priimek,
                  "OznakaVloge": req.session.oznakaVloge,
                  "D_PregledOpreme": req.session.D_Pregledopreme,
                  "D_DodajanjeOpreme": req.session.D_DodajanjeOpreme,
                  "D_UrejanjeOpreme": req.session.D_UrejanjeOpreme,
                  "D_BrisanjeOpreme": req.session.D_BrisanjeOpreme,
                  "D_UrejanjeUporabnikov": req.session.D_UrejanjeUporabnikov,
                  "D_OgledNadzornePlosce": req.session.D_OgledNadzornePlosce
                });
    }else{
        res.redirect('/login.html');
    }
});

// Start server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

// SQL query function
function SQLquery(SQLquery) {
    return new Promise((resolve, reject) => {
        pool.query(SQLquery, (err, results) => {
            if (err){
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}