require('dotenv').config();

const express = require('express');
const path = require('path');
const mysql = require('mysql');
const server = express();
const bodyparser = require('body-parser');
const session = require('express-session');
const { send } = require('process');
const fs = require('fs');

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
    const result = await SQLquery(`SELECT * FROM uporabnikiukm LEFT JOIN vloga ON uporabnikiukm.OznakaVloge = vloga.OznakaVloge WHERE UporabniskoIme = ? AND Geslo = ?`, [UporabniskoIme, UporabniskoGeslo]);
    if(result.length > 0){
        req.session.UporabniskoIme = UporabniskoIme;
        req.session.Ime = result[0].Ime;
        req.session.Priimek = result[0].Priimek;
        req.session.OznakaVloge = result[0].OznakaVloge;
        req.session.D_PregledOpreme = result[0].PregledOpreme;
        req.session.D_DodajanjeOpreme = result[0].DodajanjeOpreme;
        req.session.D_UrejanjeOpreme = result[0].UrejanjeOpreme;
        req.session.D_BrisanjeOpreme = result[0].BrisanjeOpreme;
        req.session.D_UrejanjeUporabnikov = result[0].UrejanjeUporabnikov;
        req.session.D_OgledNadzornePlosce = result[0].OgledNadzornePlosce;
        req.session.loggedIn = true;
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
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery(`SELECT * FROM delovnapostaja`);
        res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/osebaPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery(`SELECT UporabniskoIme AS "ID", Ime, Priimek, UporabniskoIme AS 'Uporabnisko ime', OznakaSluzbe AS 'Sluzba' FROM osebaukm ORDER BY Priimek`);
        res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/enotaPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery(`SELECT OznakaEnote AS 'ID', OznakaEnote AS 'Oznaka enote', NazivEnote AS 'Naziv enote', VodjaEnoteUporabniskoIme AS 'Vodja enote' FROM enotaukm ORDER BY OznakaEnote`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/sluzbaPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery(`SELECT OznakaSluzbe AS 'ID', OznakaSluzbe AS 'Oznaka sluzbe', NazivSluzbe AS 'Naziv sluzbe', OznakaEnote AS 'Oznaka enote', VodjaSluzbeUporabniskoIme AS 'Vodja službe'  FROM sluzbaukm ORDER BY OznakaSluzbe`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/uporabnikPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery(`SELECT UporabniskoIme AS 'Uporabniško ime', Ime, Priimek, OznakaVloge AS 'Vloga' FROM uporabnikiukm ORDER BY Priimek`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/vlogaPodatki', async (req, res) => {
    if(req.session.loggedIn){
        const result = await SQLquery(`SELECT OznakaVloge, NazivVloge FROM vloga ORDER BY OznakaVloge`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/sluzbaPodatkiForm', async (req, res) => {
    if(req.session.loggedIn){
        const result = await SQLquery(`SELECT OznakaSluzbe, NazivSluzbe FROM sluzbaukm ORDER BY OznakaSluzbe`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/enotaPodatkiForm', async (req, res) => {
    if(req.session.loggedIn){
        const result = await SQLquery(`SELECT OznakaEnote, NazivEnote FROM enotaukm ORDER BY OznakaEnote`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/dodajOsebo', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        let { Ime, Priimek, UporabniskoIme, OznakaSluzbe, InterniTelefoni, MobilniTelefon, ElektronskaPosta, OznakaEnote } = req.body;
        if (OznakaEnote === undefined || OznakaEnote === '') {
            OznakaEnote = null;
        }
        if (OznakaSluzbe === undefined || OznakaSluzbe === '') {
            OznakaSluzbe = null;
        }
        const result = await SQLquery(`INSERT INTO osebaukm (UporabniskoIme, Ime, Priimek, InterniTelefoni, MobilniTelefon, ElektronskaPosta, OznakaSluzbe, OznakaEnote) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [UporabniskoIme, Ime, Priimek, InterniTelefoni, MobilniTelefon, ElektronskaPosta, OznakaSluzbe, OznakaEnote]);
        if(result.affectedRows === 1){
            res.status(200).json({success: true, message: 'Oseba dodana'});
        }else{
            res.status(500).json({success: false, message: 'Napaka pri dodajanju osebe'});
        }
        
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

// HTML routes
server.get('/nadzornaPlosca', async (req, res) => {

    if(req.session.loggedIn && req.session.D_OgledNadzornePlosce == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/index.html"), 'utf8');    

        page = page.replace('<!-- NAVIGATION -->', nav);
        res.send(page);
    }else{
        res.redirect('/login');
    }
});

server.get('/opremaPregled', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/pregledOpreme.html"), 'utf8');    

        page = page.replace('<!-- NAVIGATION -->', nav);
        res.send(page);
    }else{
        res.redirect('/login');
    }
});

server.get('/osebaPregled', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/pregledOseb.html"), 'utf8');    

        page = page.replace('<!-- NAVIGATION -->', nav);
        res.send(page);
    }else{
        res.redirect('/login');
    }
});

server.get('/sifrantiPregled', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/pregledSifrantov.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        res.send(page);
    }else{
        res.redirect('/login');
    }
});

server.get('/vnosOseba', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecOseba.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/vnosOseba.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        page = page.replace('<!-- FORM -->', form);
        res.send(page);
    }else{
        res.redirect('/login');
    }
});

// User data route
server.post('/uporabnikPodatki', async (req, res) => {
    if(req.session.loggedIn){
        res.json({
            "UporabniskoIme": req.session.UporabniskoIme,
            "Ime": req.session.Ime,
            "Priimek": req.session.Priimek,
            "OznakaVloge": req.session.OznakaVloge,
            "D_PregledOpreme": req.session.D_PregledOpreme,
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