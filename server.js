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
        const result = await SQLquery(`SELECT UporabniskoIme AS "Uporabniško ime", Ime, Priimek, InterniTelefoni AS 'Interni telefoni', MobilniTelefon AS 'Mobilni telefon', ElektronskaPosta AS 'Elektronska pošta', OznakaSluzbe AS 'Služba' FROM osebaukm ORDER BY Priimek`);
        res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/enotaPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery(`SELECT e.OznakaEnote AS 'Oznaka enote', e.NazivEnote AS 'Naziv enote', CONCAT (o.Ime, ' ', o.Priimek) AS 'Vodja enote' FROM enotaukm e LEFT JOIN osebaukm o ON e.VodjaEnoteUporabniskoIme = o.UporabniskoIme ORDER BY e.OznakaEnote`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/lokacijaPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery(`SELECT OznakaLokacije AS 'Oznaka lokacije', NazivLokacije AS 'Naziv Lokacije', OznakaNadstropja AS 'Nadstropje' FROM lokacijaukm`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/osPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery(`SELECT OznakaOS AS 'Operacijski sistem' FROM operacijskisistem`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/tipiNapravPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery(`SELECT OznakaTipaNaprave AS 'Oznaka tipa', OpisTipaNaprave AS 'Opis' FROM tipnaprave`);
        return res.json(result);
    } else {
        req.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/tipiTiskalnikovPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery(`SELECT OznakaTipaTiskalnika AS 'Oznaka tipa', OpisTipaTiskalnika AS 'Opis' FROM tiptiskalnika`);
        return res.json(result);
    } else {
        req.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/sluzbaPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery(`SELECT s.OznakaSluzbe AS 'Oznaka službe', s.NazivSluzbe AS 'Naziv službe', s.OznakaEnote AS 'Oznaka enote', CONCAT(o.Ime, ' ', o.Priimek) AS 'Vodja službe'  FROM sluzbaukm s LEFT JOIN osebaukm o ON s.VodjaSluzbeUporabniskoIme = o.UporabniskoIme ORDER BY s.OznakaSluzbe`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/uporabnikPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery(`SELECT u.UporabniskoIme AS 'Uporabniško ime', u.Ime, u.Priimek, v.NazivVloge AS 'Vloga' FROM uporabnikiukm u LEFT JOIN vloga v ON u.OznakaVloge = v.OznakaVloge ORDER BY Priimek`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/proizvajalecPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery('SELECT OznakaProizvajalca AS "Oznaka proizvajalca", NazivProizvajalca AS "Naziv proizvajalca" FROM proizvajalec');
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
})

server.get('/vlogePodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery('SELECT OznakaVloge AS "Oznaka", NazivVloge AS "Naziv", OgledNadzornePlosce AS "Nadzorna plošča", PregledOpreme AS "Pregled opreme", DodajanjeOpreme AS "Dodajanje opreme", UrejanjeOpreme AS "Urejanje opreme", BrisanjeOpreme AS "Brisanje opreme", UrejanjeUporabnikov AS "Urejanje uporabnikov" FROM vloga');
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

server.get('/proizvajalecPodatkiForm', async (req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        const result = await SQLquery(`SELECT * FROM proizvajalec`);
        return res.json(result);
    } else {
        req.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/tipNapravePodatkiForm', async (req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        const result = await SQLquery(`SELECT * FROM tipnaprave`);
        return res.json(result);
    } else {
        req.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
});

server.get('/lokacijaPodatkiForm', async (req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        const result = await SQLquery(`SELECT * FROM lokacijaukm`);
        return res.json(result);
    } else {
        req.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
})

server.get('/osebaPodatkiForm', async (req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        const result = await SQLquery(`SELECT UporabniskoIme, CONCAT(Ime, ' ', Priimek) AS 'Ime' FROM osebaukm`);
        return res.json(result);
    } else {
        req.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
});

server.get('/operacijskiSistemPodatkiForm', async (req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme){
        const result = await SQLquery(`SELECT * FROM operacijskisistem`);
        return res.json(result);
    } else {
        req.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
});

server.get('/delovnaPostajaPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery('SELECT * FROM delovnapostaja');
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/monitorPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery('SELECT * FROM monitor')
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/tiskalnikPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery('SELECT * FROM tiskalnik');
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/rocnicitalecPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery('SELECT * FROM rocnicitalec');
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
        if(result.affectedRows === 1) {
            res.status(200).json({success: true, message: 'Oseba dodana'});
        }else {
            res.status(500).json({success: false, message: 'Napaka pri dodajanju osebe'});
        }
        
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/dodajDelovnoPostajo', async (req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        let {OznakaDP, ModelDP, OznakaProizvajalca, OznakaTipaNaprave, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, OznakaOS, CPU, RAM, DiskC, DiskD, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe} = req.body;
        if (OznakaTipaNaprave === undefined || OznakaTipaNaprave === '') {
            OznakaTipaNaprave = null;
        }
        if (OznakaEnote === undefined || OznakaEnote === '') {
            OznakaEnote = null;
        }
        if (OznakaSluzbe === undefined || OznakaSluzbe === '') {
            OznakaSluzbe = null;
        }

        if (DiskD === undefined || DiskD === '') {
            DiskD = 0;
        }

        console.log(OznakaDP, ModelDP, OznakaProizvajalca, OznakaTipaNaprave, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, OznakaOS, CPU, RAM, DiskC, DiskD, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe);
        const result = await SQLquery('INSERT INTO delovnapostaja (OznakaDP, ModelDP, OznakaProizvajalca, OznakaTipaNaprave, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, OznakaOS, CPU, RAM, DiskC, DiskD, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [OznakaDP, ModelDP, OznakaProizvajalca, OznakaTipaNaprave, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, OznakaOS, CPU, RAM, DiskC, DiskD, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe]);
        if(result.affectedRows === 1) {
            res.status(200).json({success: true, message: 'Delovna postaja dodana'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri dodajanju delovne postaje'})
        }
        
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/izbrisOseba', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const { ID } = req.body;
        const result = await SQLquery(`DELETE FROM osebaukm WHERE uporabniskoIme = ?`, [ID]);
        if(result.affectedRows === 1){
            res.status(200).json({success: true, message: 'Oseba izbrisana'});
        }else{
            res.status(500).json({success: false, message: 'Napaka pri brisanju osebe'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/izbrisUporabnik', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const { ID } = req.body;
        const result = await SQLquery(`DELETE FROM uporabnikiukm WHERE uporabniskoIme = ?`, [ID]);
        if(result.affectedRows === 1){
            res.status(200).json({success: true, message: 'Uporabnik izbrisan'});
        }else{
            res.status(500).json({success: false, message: 'Napaka pri brisanju uporabnika'});
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
    }else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/delovnaPostajaVnos', async (req,res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecDelovnaPostaja.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/vnosDelovnaPostaja.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        page = page.replace('<!-- FORM -->',form);
        res.send(page);
    } else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/osebaPregled', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/pregledOseb.html"), 'utf8');    

        page = page.replace('<!-- NAVIGATION -->', nav);
        res.send(page);
    }else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
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
    }else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/urediOsebo', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecOseba.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/urediOsebo.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        page = page.replace('<!-- FORM -->', form);
        res.send(page);
    }else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
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