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
        res.redirect('/login?error=1');
    }
});

// Login/Logout routes
server.get('/login', async (req, res) => {
    const page = fs.readFileSync(path.join(__dirname, 'Public', 'login.html'), 'utf8');
    const hasError = !!req.session.loginError;
    if (hasError) {
        delete req.session.loginError;
    }
    const flagScript = `<script>window.__LOGIN_ERROR__ = ${hasError ? 'true' : 'false'};</script>`;
    res.send(page.replace('<!-- LOGIN_ERROR_FLAG -->', flagScript));
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
        req.session.loginError = true;
        res.redirect('/login');
    }
});

server.post('/logout', async (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Routes

// Edit helper routes
server.post('/nastaviEditID', async (req, res) => {
    if(req.session.loggedIn){
        console.log('EditID je: ');
        console.log(req.body);
        console.log(req.body.EditID);
        const id = req.body.EditID;
        req.session.editID = id;
        return res.sendStatus(200);
    } else {
        res.redirect('login')
    }
});

server.get('/osebaPodatkiEdit', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const id = req.session.editID;
        console.log(id);
        if(!id){
            res.status(400).json({error: 'EditID ni bil nastavljen!'});
        } else {
            const result = await SQLquery(`SELECT * FROM osebaukm WHERE UporabniskoIme = ? LIMIT 1`, [id]);
            console.log(result);
            if(!result || result.length === 0){
                res.status(400).json({error: 'Ni vnosa s tem ID-jem'});
            } else {
                res.json(result[0])
            }
        }
    } else if (!req.session.loggedIn) {
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/uporabnikPodatkiEdit', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const id = req.session.editID;
        console.log(id);
        if(!id){
            res.status(400).json({error: 'EditID ni bil nastavljen!'});
        } else {
            const result = await SQLquery(`SELECT * FROM uporabnikiukm WHERE UporabniskoIme = ? LIMIT 1`, [id]);
            console.log(result);
            if(!result || result.length === 0){
                res.status(400).json({error: 'Ni vnosa s tem ID-jem'});
            } else {
                res.json(result[0])
            }
        }
    } else if (!req.session.loggedIn) {
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

// Data routes

server.get('/auditPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const result = await SQLquery('SELECT AuditID AS "ID", DATE_FORMAT(EventTime, "%Y-%m-%d %H:%i:%s") AS "Čas dogodka", TableName AS "Tabela", Action AS "Dejanje", RecordPK AS "Primarni ključ", DbUser AS "Uporabnik DB", AppUser AS "Uporabnik aplikacije", ChangedColumns AS "Spremenjeni stolpci", OldRow AS "Stari zapis", NewRow AS "Novi zapis" FROM auditlog ORDER BY EventTime ASC');
        res.json(result);
    } else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
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

server.get('/osebaPodatkiPregled', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery(`SELECT UporabniskoIme AS "Uporabniško ime", Ime, Priimek FROM osebaukm ORDER BY Priimek`);
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
        const result = await SQLquery(`SELECT OznakaOS AS 'Operacijski sistem', KategorijaOS AS 'Kategorija' FROM operacijskisistem`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/virtualServerPodatki', async(req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery(`SELECT v.ServerName AS 'Naziv strežnika', v.ClusterNode AS 'Cluster', v.OwnerNode AS 'Lastnik', v.Environment AS 'Okolje', v.Criticality AS 'Kritičnost', v.KeySoftware AS 'Ključna programska oprema', v.OSName AS 'Operacijski sistem', v.IP, v.DynamicMemory AS 'Dinamičen spomin', v.RAMStartupGB AS 'RAM startup GB', v.RAMMinGB AS 'RAM min GB', v.RAMMaxGB AS 'RAM max GB', v.MemoryBufferPct AS 'Memory buffer %', v.DiskCVHDMaxGB AS 'Disk C VHD max GB', v.DiskCVHDFileGB AS 'Disk C VHD file GB', v.DiskUsagePct AS 'Zasedenost diska %', v.DiskCVHDPath AS 'Disck C VHD pot', v.Notes AS 'Opombe', DATE_FORMAT(v.CreatedAt, '%Y-%m-%d') AS 'Ustvarjeno', DATE_FORMAT(v.UpdatedAt, '%Y-%m-%d') AS 'Posodobljeno' FROM virtualserver v LEFT JOIN operacijskisistem o ON v.OSName = o.OznakaOS`);
        res.json(result);
    } else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
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

server.get('/tipTiskalnikaForm', async (req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        const result = await SQLquery(`SELECT * FROM tiptiskalnika`);
        return res.json(result);
    } else {
        req.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
})

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
        const result = await SQLquery(`SELECT UporabniskoIme, CONCAT(Priimek, ', ', Ime) AS 'Ime' FROM osebaukm`);
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

server.get('/delovnaPostajaPodatkiForm', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery(`SELECT OznakaDP FROM delovnapostaja`)
        return res.json(result);
    } else {
        req.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
});

server.get('/delovnaPostajaPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery(`SELECT dp.OznakaDP AS 'Oznaka DP', dp.ModelDP AS 'Model DP', dp.OznakaProizvajalca AS 'Proizvajalec', tn.OpisTipaNaprave AS 'Tip naprave', lok.NazivLokacije AS 'Lokacija', dp.InventarnaStevilka AS 'Inventarna številka', CONCAT_WS(' ', os.Ime, os.Priimek) AS 'Uporabnik', dp.OznakaEnote AS 'Enota', dp.OznakaSluzbe AS 'Služba', dp.OznakaOS AS 'Operacijski sistem', dp.CPU, dp.RAM, dp.DiskC AS 'Disk C', dp.DiskD AS 'Disk D', dp.SerijskaStevilka AS 'Serijska številka', DATE_FORMAT(dp.DatumProizvodnje, '%Y-%m-%d') AS 'Datum proizvodnje', DATE_FORMAT(dp.DatumNakupa, '%Y-%m-%d') AS 'Datum nakupa', DATE_FORMAT(dp.DatumVnosa, '%Y-%m-%d') AS 'Datum vnosa', DATE_FORMAT(dp.DatumPosodobitve, '%Y-%m-%d') AS 'Datum posodobitve', dp.Opombe FROM delovnapostaja dp LEFT JOIN osebaukm os ON dp.OznakaOsebeUporabniskoIme = os.UporabniskoIme LEFT JOIN lokacijaukm lok ON dp.OznakaLokacije = lok.OznakaLokacije LEFT JOIN tipnaprave tn ON dp.OznakaTipaNaprave = tn.OznakaTipaNaprave ORDER BY dp.OznakaDP`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/monitorPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery(`SELECT m.OznakaMonitorja AS "Oznaka Monitorja", m.ModelMonitorja AS "Model Monitorja", m.OznakaProizvajalca AS "Proizvajalec", m.OznakaDP AS "Delovna Postaja", lok.NazivLokacije AS "Lokacija", m.InventarnaStevilka AS "Inventarna številka", CONCAT_WS(' ', os.Ime, os.Priimek) AS "Uporabnik", m.OznakaEnote AS "Enota", m.OznakaSluzbe AS "Služba", m.Velikost, m.Kamera, m.SerijskaStevilka AS "Serijska številka", DATE_FORMAT(m.DatumProizvodnje, '%Y-%m-%d') AS "Datum proizvodnje", DATE_FORMAT(m.DatumNakupa, '%Y-%m-%d') AS "Datum nakupa", DATE_FORMAT(m.DatumVnosa, '%Y-%m-%d') AS "Datum vnosa", DATE_FORMAT(m.DatumPosodobitve, '%Y-%m-%d') AS "Datum posodobitve", m.Opombe FROM monitor m LEFT JOIN osebaukm os ON m.OznakaOsebeUporabniskoIme = os.UporabniskoIme LEFT JOIN lokacijaukm lok ON m.OznakaLokacije = lok.OznakaLokacije ORDER BY m.OznakaMonitorja`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/tiskalnikPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery(`SELECT t.OznakaTiskalnika AS "Oznaka tiskalnika", t.ModelTiskalnika AS "Model tiskalnika", t.OznakaProizvajalca AS "Proizvajalec", t.OznakaTipaTiskalnika AS "Tip tiskalnika", t.OznakaDP AS "Delovna postaja", lok.NazivLokacije AS "Lokacija", t.InventarnaStevilka AS "Inventarna številka", CONCAT_WS(' ', os.Ime, os.Priimek) AS "Uporabnik", t.OznakaEnote AS "Enota", t.OznakaSluzbe AS "Služba", t.IP, t.TiskalniskaVrsta AS "Tiskalniška vrsta", t.SerijskaStevilka AS "Serijska številka", t.ProduktnaStevilka AS "Produktna številka", DATE_FORMAT(t.DatumProizvodnje, '%Y-%m-%d') AS "Datum proizvodnje", DATE_FORMAT(t.DatumNakupa, '%Y-%m-%d') AS "Datum nakupa", DATE_FORMAT(t.DatumVnosa, '%Y-%m-%d') AS "Datum vnosa", DATE_FORMAT(t.DatumPosodobitve, '%Y-%m-%d') AS "Datum posodobitve", t.Opombe FROM tiskalnik t LEFT JOIN osebaukm os ON t.OznakaOsebeUporabniskoIme = os.UporabniskoIme LEFT JOIN lokacijaukm lok ON t.OznakaLokacije = lok.OznakaLokacije ORDER BY t.OznakaTiskalnika`);
        return res.json(result);
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/rocnicitalecPodatki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const result = await SQLquery(`SELECT rc.OznakaRocnegaCitalca AS "Oznaka ročnega čitalca", rc.ModelRocnegaCitalca AS "Model ročnega čitalca", rc.OznakaProizvajalca AS "Proizvajalec", rc.OznakaDP AS "Delovna postaja", lok.NazivLokacije AS "Lokacija", rc.InventarnaStevilka AS "Inventarna številka", CONCAT_WS(' ', os.Ime, os.Priimek) AS "Uporabnik", rc.OznakaEnote AS "Enota", rc.OznakaSluzbe AS "Služba", rc.Stojalo, rc.SerijskaStevilka AS "Serijska številka", DATE_FORMAT(rc.DatumProizvodnje, '%Y-%m-%d') AS "Datum proizvodnje", DATE_FORMAT(rc.DatumNakupa, '%Y-%m-%d') AS "Datum nakupa", DATE_FORMAT(rc.DatumVnosa, '%Y-%m-%d') AS "Datum vnosa", DATE_FORMAT(rc.DatumPosodobitve, '%Y-%m-%d') AS "Datum posodobitve", rc.Opombe FROM rocnicitalec rc LEFT JOIN osebaukm os ON rc.OznakaOsebeUporabniskoIme = os.UporabniskoIme LEFT JOIN lokacijaukm lok ON rc.OznakaLokacije = lok.OznakaLokacije ORDER BY rc.OznakaRocnegaCitalca`);
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
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, `INSERT INTO osebaukm (UporabniskoIme, Ime, Priimek, InterniTelefoni, MobilniTelefon, ElektronskaPosta, OznakaSluzbe, OznakaEnote) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [UporabniskoIme, Ime, Priimek, InterniTelefoni, MobilniTelefon, ElektronskaPosta, OznakaSluzbe, OznakaEnote]);
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
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'INSERT INTO delovnapostaja (OznakaDP, ModelDP, OznakaProizvajalca, OznakaTipaNaprave, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, OznakaOS, CPU, RAM, DiskC, DiskD, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [OznakaDP, ModelDP, OznakaProizvajalca, OznakaTipaNaprave, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, OznakaOS, CPU, RAM, DiskC, DiskD, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe]);
        if(result.affectedRows === 1) {
            res.status(200).json({success: true, message: 'Delovna postaja dodana'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri dodajanju delovne postaje'})
        }
        
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/urediDelovnaPostaja', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        let {OznakaDP, ModelDP, OznakaProizvajalca, OznakaTipaNaprave, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, OznakaOS, CPU, RAM, DiskC, DiskD, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe, ID} = req.body;
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
            DiskD = null;
        }
        if (Opombe === undefined || Opombe === '') {
            Opombe = null;
        }
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'UPDATE delovnapostaja SET OznakaDP = ?, ModelDP = ?, OznakaProizvajalca = ?, OznakaTipaNaprave = ?, OznakaLokacije = ?, InventarnaStevilka = ?, OznakaOsebeUporabniskoIme = ?, OznakaEnote = ?, OznakaSluzbe = ?, OznakaOS = ?, CPU = ?, RAM = ?, DiskC = ?, DiskD = ?, SerijskaStevilka = ?, DatumProizvodnje = ?, DatumNakupa = ?, Opombe = ? WHERE OznakaDP = ?', [OznakaDP, ModelDP, OznakaProizvajalca, OznakaTipaNaprave, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, OznakaOS, CPU, RAM, DiskC, DiskD, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe, ID]);
        if(result.affectedRows === 1){
            res.status(200).json({success: true, message: 'Delovna postaja uspešno urejena'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri urejanju delovne postaje'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/dodajMonitor', async (req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        let {OznakaMonitorja, ModelMonitorja, OznakaProizvajalca, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, Velikost, Kamera, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe} = req.body;

        if(OznakaDP == undefined || OznakaDP == ' '){
            OznakaDP = null;
        }
        if(InventarnaStevilka == undefined || InventarnaStevilka == ''){
            InventarnaStevilka = null;
        }
        if(OznakaEnote == undefined || OznakaEnote == ''){
            OznakaEnote = null;
        }
        if(OznakaSluzbe == undefined || OznakaSluzbe == ''){
            OznakaSluzbe = null;
        }
        if(Opombe == undefined || Opombe == ''){
            Opombe = null;
        }

        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'INSERT INTO monitor(OznakaMonitorja, ModelMonitorja, OznakaProizvajalca, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, Velikost, Kamera, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [OznakaMonitorja, ModelMonitorja, OznakaProizvajalca, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, Velikost, Kamera, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe]);
        if(result.affectedRows === 1) {
            res.status(200).json({success: true, message: 'Monitor uspešno dodan'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri dodajanju monitorja'})
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/urediMonitor', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        let {OznakaMonitorja, ModelMonitorja, OznakaProizvajalca, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, Velikost, Kamera, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe, ID} = req.body;

        if(OznakaDP == undefined || OznakaDP == ' '){
            OznakaDP = null;
        }
        if(InventarnaStevilka == undefined || InventarnaStevilka == ''){
            InventarnaStevilka = null;
        }
        if(OznakaEnote == undefined || OznakaEnote == ''){
            OznakaEnote = null;
        }
        if(OznakaSluzbe == undefined || OznakaSluzbe == ''){
            OznakaSluzbe = null;
        }
        if(Opombe == undefined || Opombe == ''){
            Opombe = null;
        }

        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'UPDATE monitor SET OznakaMonitorja = ?, ModelMonitorja = ?, OznakaProizvajalca = ?, OznakaDP = ?, OznakaLokacije = ?, InventarnaStevilka = ?, OznakaOsebeUporabniskoIme = ?, OznakaEnote = ?, OznakaSluzbe = ?, Velikost = ?, Kamera = ?, SerijskaStevilka = ?, DatumProizvodnje = ?, DatumNakupa = ?, Opombe = ? WHERE OznakaMonitorja = ?', [OznakaMonitorja, ModelMonitorja, OznakaProizvajalca, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, Velikost, Kamera, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe, ID]);
        if(result.affectedRows === 1) {
            res.status(200).json({success: true, message: 'Monitor uspešno urejen'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri urejanju monitorja'})
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/urediTiskalnik', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        let {OznakaTiskalnika, ModelTiskalnika, OznakaProizvajalca, OznakaTipaTiskalnika, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, IP, TiskalniskaVrsta, SerijskaStevilka, ProduktnaStevilka, DatumProizvodnje, DatumNakupa, Opombe, ID} = req.body;

        if(OznakaDP == undefined || OznakaDP == ' '){
            OznakaDP = null;
        }
        if(InventarnaStevilka == undefined || InventarnaStevilka == ''){
            InventarnaStevilka = null;
        }
        if(OznakaEnote == undefined || OznakaEnote == ''){
            OznakaEnote = null;
        }
        if(OznakaSluzbe == undefined || OznakaSluzbe == ''){
            OznakaSluzbe = null;
        }
        if(IP == undefined || IP == ''){
            IP = null;
        }
        if(TiskalniskaVrsta == undefined || TiskalniskaVrsta == ''){
            TiskalniskaVrsta = null;
        }
        if(SerijskaStevilka == undefined || SerijskaStevilka == ''){
            SerijskaStevilka = null;
        }
        if(ProduktnaStevilka == undefined || ProduktnaStevilka == ''){
            ProduktnaStevilka = null;
        }
        if(Opombe == undefined || Opombe == ''){
            Opombe = null;
        }

        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'UPDATE tiskalnik SET OznakaTiskalnika = ?, ModelTiskalnika = ?, OznakaProizvajalca = ?, OznakaTipaTiskalnika = ?, OznakaDP = ?, OznakaLokacije = ?, InventarnaStevilka = ?, OznakaOsebeUporabniskoIme = ?, OznakaEnote = ?, OznakaSluzbe = ?, IP = ?, TiskalniskaVrsta = ?, SerijskaStevilka = ?, ProduktnaStevilka = ?, DatumProizvodnje = ?, DatumNakupa = ?, Opombe = ? WHERE OznakaTiskalnika = ?', [OznakaTiskalnika, ModelTiskalnika, OznakaProizvajalca, OznakaTipaTiskalnika, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, IP, TiskalniskaVrsta, SerijskaStevilka, ProduktnaStevilka, DatumProizvodnje, DatumNakupa, Opombe, ID]);
        if(result.affectedRows === 1) {
            res.status(200).json({success: true, message: 'Tiskalnik uspešno urejen'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri urejanju tiskalnika'})
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/dodajTiskalnik', async(req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        let {OznakaTiskalnika, ModelTiskalnika, OznakaProizvajalca, OznakaTipaTiskalnika, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, IP, TiskalniskaVrsta, SerijskaStevilka, ProduktnaStevilka, DatumProizvodnje, DatumNakupa, Opombe} = req.body;

        if(OznakaDP == undefined || OznakaDP == ' '){
            OznakaDP = null;
        }
        if(InventarnaStevilka == undefined || InventarnaStevilka == ''){
            InventarnaStevilka = null;
        }
        if(OznakaEnote == undefined || OznakaEnote == ''){
            OznakaEnote = null;
        }
        if(OznakaSluzbe == undefined || OznakaSluzbe == ''){
            OznakaSluzbe = null;
        }
        if(IP == undefined || IP == ''){
            IP = null;
        }
        if(TiskalniskaVrsta == undefined || TiskalniskaVrsta == ''){
            TiskalniskaVrsta = null;
        }
        if(SerijskaStevilka == undefined || SerijskaStevilka == ''){
            SerijskaStevilka = null;
        }
        if(ProduktnaStevilka == undefined || ProduktnaStevilka == ''){
            ProduktnaStevilka = null;
        }
        if(Opombe == undefined || Opombe == ''){
            Opombe = null;
        }

        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, `INSERT INTO tiskalnik(OznakaTiskalnika, ModelTiskalnika, OznakaProizvajalca, OznakaTipaTiskalnika, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, IP, TiskalniskaVrsta, SerijskaStevilka, ProduktnaStevilka, DatumProizvodnje, DatumNakupa, Opombe) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [OznakaTiskalnika, ModelTiskalnika, OznakaProizvajalca, OznakaTipaTiskalnika, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, IP, TiskalniskaVrsta, SerijskaStevilka, ProduktnaStevilka, DatumProizvodnje, DatumNakupa, Opombe]);
        if(result.affectedRows === 1) {
            res.status(200).json({success: true, message: 'Tiskalnik dodan'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri dodajanju tiskalnika'})
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/urediRocniCitalec', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        let {OznakaRocnegaCitalca, ModelRocnegaCitalca, OznakaProizvajalca, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, Stojalo, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe, ID} = req.body;

        if(OznakaDP == undefined || OznakaDP == ' '){
            OznakaDP = null;
        }
        if(InventarnaStevilka == undefined || InventarnaStevilka == ''){
            InventarnaStevilka = null;
        }
        if(OznakaEnote == undefined || OznakaEnote == ''){
            OznakaEnote = null;
        }
        if(OznakaSluzbe == undefined || OznakaSluzbe == ''){
            OznakaSluzbe = null;
        }
        if(SerijskaStevilka == undefined || SerijskaStevilka == ''){
            SerijskaStevilka = null;
        }
        if(Opombe == undefined || Opombe == ''){
            Opombe = null;
        }

        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'UPDATE rocnicitalec SET OznakaRocnegaCitalca = ?, ModelRocnegaCitalca = ?, OznakaProizvajalca = ?, OznakaDP = ?, OznakaLokacije = ?, InventarnaStevilka = ?, OznakaOsebeUporabniskoIme = ?, OznakaEnote = ?, OznakaSluzbe = ?, Stojalo = ?, SerijskaStevilka = ?, DatumProizvodnje = ?, DatumNakupa = ?, Opombe = ? WHERE OznakaRocnegaCitalca = ?', [OznakaRocnegaCitalca, ModelRocnegaCitalca, OznakaProizvajalca, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, Stojalo, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe, ID]);
        if(result.affectedRows === 1) {
            res.status(200).json({success: true, message: 'Ročni čitalec uspešno urejen'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri urejanju ročnega čitalca'})
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/dodajRocniCitalec', async (req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        let {OznakaRocnegaCitalca, ModelRocnegaCitalca, OznakaProizvajalca, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, Stojalo, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe} = req.body;
        
        if(OznakaDP == undefined || OznakaDP == ' '){
            OznakaDP = null;
        }
        if(InventarnaStevilka == undefined || InventarnaStevilka == ''){
            InventarnaStevilka = null;
        }
        if(OznakaEnote == undefined || OznakaEnote == ''){
            OznakaEnote = null;
        }
        if(OznakaSluzbe == undefined || OznakaSluzbe == ''){
            OznakaSluzbe = null;
        }
        if(SerijskaStevilka == undefined || SerijskaStevilka == ''){
            SerijskaStevilka = null;
        }
        if(Opombe == undefined || Opombe == ''){
            Opombe = null;
        }

        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, `INSERT INTO rocnicitalec(OznakaRocnegaCitalca, ModelRocnegaCitalca, OznakaProizvajalca, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, Stojalo, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [OznakaRocnegaCitalca, ModelRocnegaCitalca, OznakaProizvajalca, OznakaDP, OznakaLokacije, InventarnaStevilka, OznakaOsebeUporabniskoIme, OznakaEnote, OznakaSluzbe, Stojalo, SerijskaStevilka, DatumProizvodnje, DatumNakupa, Opombe]);
        if(result.affectedRows === 1) {
                res.status(200).json({success: true, message: 'Ročni čitalec dodan'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri dodajanju ročnega čitalca'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/dodajUporabnik', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        let {UporabniskoIme,Ime,Priimek,Geslo,OznakaVloge} = req.body;
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'INSERT INTO uporabnikiukm(UporabniskoIme, Ime, Priimek, Geslo, OznakaVloge) VALUES (?,?,?,?,?)', [UporabniskoIme,Ime,Priimek,Geslo,OznakaVloge]);
        if(result.affectedRows === 1) {
                res.status(200).json({success: true, message: 'Uporabnik uspešno dodan'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri dodajanju uporabnika'});
        }
    } else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.post('/izbrisOseba', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const { ID } = req.body;
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, `DELETE FROM osebaukm WHERE uporabniskoIme = ?`, [ID]);
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
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, `DELETE FROM uporabnikiukm WHERE uporabniskoIme = ?`, [ID]);
        if(result.affectedRows === 1){
            res.status(200).json({success: true, message: 'Uporabnik izbrisan'});
        }else{
            res.status(500).json({success: false, message: 'Napaka pri brisanju uporabnika'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.post('/izbrisDelovnaPostaja', async (req, res) => {
    if(req.session.loggedIn && req.session.D_BrisanjeOpreme == 1){
        const { ID } = req.body;
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, `DELETE FROM delovnapostaja WHERE OznakaDP = ?`, [ID]);
        if(result.affectedRows === 1){
            res.status(200).json({success: true, message: 'Delovna postaja izbrisana'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri brisanju delovne postaje'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
})

server.post('/izbrisMonitor', async (req, res) => {
    if(req.session.loggedIn && req.session.D_BrisanjeOpreme == 1){
        const { ID } = req.body;
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'DELETE FROM monitor WHERE OznakaMonitorja = ?', [ID]);
        if(result.affectedRows === 1){
            res.status(200).json({success: true, message: 'Monitor izbrisan'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri brisanju monitorja'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
});

server.post('/izbrisTiskalnik', async (req, res) => {
    if(req.session.loggedIn && req.session.D_BrisanjeOpreme == 1){
        const { ID } = req.body;
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'DELETE FROM tiskalnik WHERE OznakaTiskalnika = ?', [ID]);
        if(result.affectedRows === 1){
            res.status(200).json({success: true, message: 'Tiskalnik izbrisan'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri brisanju tiskalnika'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
});

server.post('/izbrisRocniCitalec', async (req, res) =>{
    if(req.session.loggedIn && req.session.D_BrisanjeOpreme == 1){
        const { ID } = req.body;
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'DELETE FROM rocnicitalec WHERE OznakaRocnegaCitalca = ?', [ID]);
        if(result.affectedRows === 1){
            res.status(200).json({success: true, message: 'Ročni čitalec izbrisan'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri brisanju ročnega čitalca'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
});

server.post('/urediOsebo', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        let {UporabniskoIme,Ime,Priimek,InterniTelefoni,MobilniTelefon,ElektronskaPosta,OznakaSluzbe,OznakaEnote,ID} = req.body;
        if(InterniTelefoni == undefined || InterniTelefoni == ''){
            InterniTelefoni = null;
        }
        if(MobilniTelefon == undefined || MobilniTelefon == ''){
            MobilniTelefon = null;
        }
        if(OznakaSluzbe == undefined || OznakaSluzbe == ''){
            OznakaSluzbe = null;
        }
        if(OznakaEnote == undefined || OznakaEnote == ''){
            OznakaEnote = null;
        }
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'UPDATE osebaukm SET UporabniskoIme = ?, Ime = ?, Priimek = ?, InterniTelefoni = ?, MobilniTelefon = ?, ElektronskaPosta = ?, OznakaSluzbe = ?, OznakaEnote = ? WHERE UporabniskoIme = ?', [UporabniskoIme,Ime,Priimek,InterniTelefoni,MobilniTelefon,ElektronskaPosta,OznakaSluzbe,OznakaEnote,ID]);
        if(result.affectedRows === 1){
            res.status(200).json({success: true, message: 'Vnos uspešno spremenjen'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri urejanju vnosa'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
});

server.post('/urediUporabnika', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        let {UporabniskoIme,Ime,Priimek,Geslo,OznakaVloge,ID} = req.body;
        const appUser = getAppUserOrRespond(req, res);
        if (!appUser) return;
        const result = await SQLqueryWithAppUser(appUser, 'UPDATE uporabnikiukm SET UporabniskoIme = ?, Ime = ?, Priimek = ?, Geslo = ?, OznakaVloge = ? WHERE UporabniskoIme = ?', [UporabniskoIme,Ime,Priimek,Geslo,OznakaVloge,ID]);
        if(result.affectedRows === 1){
            res.status(200).json({success: true, message: 'Uporabnik uspešno urejen'});
        } else {
            res.status(500).json({success: false, message: 'Napaka pri urejanju uporabnika'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permission'});
    }
});

// HTML routes
server.get('/auditPregled', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/pregledAudit.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        res.send(page);
    } else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

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

server.get('/opremaOsebePregled', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/pregledOpremeOsebe.html"), 'utf8');    

        page = page.replace('<!-- NAVIGATION -->', nav);
        res.send(page);
    }else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/uporabnikVnos', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecUporabnik.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/vnosUporabnik.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        page = page.replace('<!-- FORM -->', form);

        res.send(page);
    } else if (!req.session.loggedIn){
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

server.get('/urediDelovnaPostaja', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecDelovnaPostaja.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/urediDelovnaPostaja.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        page = page.replace('<!-- FORM -->', form);
        res.send(page);
    }else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/delovnaPostajaPodatkiEdit', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        const id = req.session.editID;
        console.log(id);
        if(!id){
            res.status(400).json({error: 'EditID ni bil nastavljen!'});
        } else {
            const result = await SQLquery(`SELECT * FROM delovnapostaja WHERE OznakaDP = ? LIMIT 1`, [id]);
            console.log(result);
            if(!result || result.length === 0){
                res.status(400).json({error: 'Ni vnosa s tem ID-jem'});
            } else {
                res.json(result[0])
            }
        }
    } else if (!req.session.loggedIn) {
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/monitorPodatkiEdit', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        const id = req.session.editID;
        console.log(id);
        if(!id){
            res.status(400).json({error: 'EditID ni bil nastavljen!'});
        } else {
            const result = await SQLquery(`SELECT * FROM monitor WHERE OznakaMonitorja = ? LIMIT 1`, [id]);
            console.log(result);
            if(!result || result.length === 0){
                res.status(400).json({error: 'Ni vnosa s tem ID-jem'});
            } else {
                res.json(result[0])
            }
        }
    } else if (!req.session.loggedIn) {
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/tiskalnikPodatkiEdit', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        const id = req.session.editID;
        console.log(id);
        if(!id){
            res.status(400).json({error: 'EditID ni bil nastavljen!'});
        } else {
            const result = await SQLquery(`SELECT * FROM tiskalnik WHERE OznakaTiskalnika = ? LIMIT 1`, [id]);
            console.log(result);
            if(!result || result.length === 0){
                res.status(400).json({error: 'Ni vnosa s tem ID-jem'});
            } else {
                res.json(result[0])
            }
        }
    } else if (!req.session.loggedIn) {
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/monitorVnos', async(req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecMonitor.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/vnosMonitor.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        page = page.replace('<!-- FORM -->', form);
        res.send(page);
    } else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/urediMonitor', async(req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecMonitor.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/urediMonitor.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        page = page.replace('<!-- FORM -->', form);
        res.send(page);
    } else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/urediTiskalnik', async(req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecTiskalnik.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/urediTiskalnik.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        page = page.replace('<!-- FORM -->', form);
        res.send(page);
    } else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/tiskalnikVnos', async(req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecTiskalnik.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/vnosTiskalnik.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        page = page.replace('<!-- FORM -->', form);
        res.send(page);
    } else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/rocniCitalecPodatkiEdit', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        const id = req.session.editID;
        console.log(id);
        if(!id){
            res.status(400).json({error: 'EditID ni bil nastavljen!'});
        } else {
            const result = await SQLquery(`SELECT * FROM rocnicitalec WHERE OznakaRocnegaCitalca = ? LIMIT 1`, [id]);
            console.log(result);
            if(!result || result.length === 0){
                res.status(400).json({error: 'Ni vnosa s tem ID-jem'});
            } else {
                res.json(result[0])
            }
        }
    } else if (!req.session.loggedIn) {
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/urediRocniCitalec', async(req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeOpreme == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecRocniCitalec.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/urediRocniCitalec.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        page = page.replace('<!-- FORM -->', form);
        res.send(page);
    } else if (!req.session.loggedIn){
        res.redirect('/login');
    } else {
        res.redirect('/nadzornaPlosca');
    }
});

server.get('/rocniCitalecVnos', async(req, res) => {
    if(req.session.loggedIn && req.session.D_DodajanjeOpreme == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecRocniCitalec.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/vnosRocniCitalec.html"), 'utf8');

        page = page.replace('<!-- NAVIGATION -->', nav);
        page = page.replace('<!-- FORM -->', form);
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

server.get('/urediUporabnika', async (req, res) => {
    if(req.session.loggedIn && req.session.D_UrejanjeUporabnikov == 1){
        const nav = fs.readFileSync(path.join(__dirname,"Public","/HTML/navigacijskaVrstica.html"), 'utf8');
        const form = fs.readFileSync(path.join(__dirname,"Public","/HTML/obrazecUporabnik.html"), 'utf8');
        let page = fs.readFileSync(path.join(__dirname,"Public","/HTML/urediUporabnika.html"), 'utf8');

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

server.get('/nadzornaPloscaPodatki', async (req, res) => {
    if(!(req.session.loggedIn && req.session.D_OgledNadzornePlosce == 1)){
        return res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }

    try {
        const parsedStarost = parseInt(req.query.starost, 10);
        const starost = Number.isFinite(parsedStarost) ? parsedStarost : 0;
        
        const [
            delovnePostaje,
            monitorji,
            tiskalniki,
            rocniCitalci,
            virtualniStrezniki,
            stareDp,
            stariMonitorji,
            stariTiskalniki,
            stariCitalci,
            letnice,
            dpPoLetu,
            monitorjiPoLetu,
            tiskalnikiPoLetu,
            citalciPoLetu
        ] = await Promise.all([
            SQLquery('SELECT COUNT(*) AS stevilo FROM delovnapostaja'),
            SQLquery('SELECT COUNT(*) AS stevilo FROM monitor'),
            SQLquery('SELECT COUNT(*) AS stevilo FROM tiskalnik'),
            SQLquery('SELECT COUNT(*) AS stevilo FROM rocnicitalec'),
            SQLquery('SELECT COUNT(*) AS stevilo FROM virtualserver'),
            SQLquery('SELECT COUNT(*) AS stevilo FROM delovnapostaja WHERE DatumProizvodnje IS NOT NULL AND DatumProizvodnje < DATE_SUB(CURDATE(), INTERVAL ? YEAR)', [starost]),
            SQLquery('SELECT COUNT(*) AS stevilo FROM monitor WHERE DatumProizvodnje IS NOT NULL AND DatumProizvodnje < DATE_SUB(CURDATE(), INTERVAL ? YEAR)', [starost]),
            SQLquery('SELECT COUNT(*) AS stevilo FROM tiskalnik WHERE DatumProizvodnje IS NOT NULL AND DatumProizvodnje < DATE_SUB(CURDATE(), INTERVAL ? YEAR)', [starost]),
            SQLquery('SELECT COUNT(*) AS stevilo FROM rocnicitalec WHERE DatumProizvodnje IS NOT NULL AND DatumProizvodnje < DATE_SUB(CURDATE(), INTERVAL ? YEAR)', [starost]),
            SQLquery(`
                SELECT
                    MIN(Leto) AS minLeto,
                    MAX(Leto) AS maxLeto
                FROM (
                    SELECT YEAR(DatumProizvodnje) AS Leto FROM delovnapostaja WHERE DatumProizvodnje IS NOT NULL
                    UNION ALL
                    SELECT YEAR(DatumProizvodnje) AS Leto FROM monitor WHERE DatumProizvodnje IS NOT NULL
                    UNION ALL
                    SELECT YEAR(DatumProizvodnje) AS Leto FROM tiskalnik WHERE DatumProizvodnje IS NOT NULL
                    UNION ALL
                    SELECT YEAR(DatumProizvodnje) AS Leto FROM rocnicitalec WHERE DatumProizvodnje IS NOT NULL
                ) x
            `),
            SQLquery(`SELECT YEAR(DatumProizvodnje) AS Leto, COUNT(*) AS Stevilo FROM delovnapostaja WHERE DatumProizvodnje IS NOT NULL GROUP BY YEAR(DatumProizvodnje) ORDER BY YEAR(DatumProizvodnje)`),
            SQLquery(`SELECT YEAR(DatumProizvodnje) AS Leto, COUNT(*) AS Stevilo FROM monitor WHERE DatumProizvodnje IS NOT NULL GROUP BY YEAR(DatumProizvodnje) ORDER BY YEAR(DatumProizvodnje)`),
            SQLquery(`SELECT YEAR(DatumProizvodnje) AS Leto, COUNT(*) AS Stevilo FROM tiskalnik WHERE DatumProizvodnje IS NOT NULL GROUP BY YEAR(DatumProizvodnje) ORDER BY YEAR(DatumProizvodnje)`),
            SQLquery(`SELECT YEAR(DatumProizvodnje) AS Leto, COUNT(*) AS Stevilo FROM rocnicitalec WHERE DatumProizvodnje IS NOT NULL GROUP BY YEAR(DatumProizvodnje) ORDER BY YEAR(DatumProizvodnje)`)
        ]);

        res.json({
            kpi: {
                delovnePostaje: Number(delovnePostaje[0]?.stevilo || 0),
                monitorji: Number(monitorji[0]?.stevilo || 0),
                tiskalniki: Number(tiskalniki[0]?.stevilo || 0),
                rocniCitalci: Number(rocniCitalci[0]?.stevilo || 0),
                virtualniStrezniki: Number(virtualniStrezniki[0]?.stevilo || 0)
            },
            starejseOd5Let: {
                delovnePostaje: Number(stareDp[0]?.stevilo || 0),
                monitorji: Number(stariMonitorji[0]?.stevilo || 0),
                tiskalniki: Number(stariTiskalniki[0]?.stevilo || 0),
                rocniCitalci: Number(stariCitalci[0]?.stevilo || 0)
            },
            graf: {
                minLeto: letnice[0]?.minLeto ? Number(letnice[0].minLeto) : null,
                maxLeto: letnice[0]?.maxLeto ? Number(letnice[0].maxLeto) : null,
                delovnePostaje: dpPoLetu,
                monitorji: monitorjiPoLetu,
                tiskalniki: tiskalnikiPoLetu,
                rocniCitalci: citalciPoLetu
            }
        });
    } catch (err) {
        console.error('Napaka pri pridobivanju podatkov za nadzorno ploščo:', err);
        res.status(500).json({error: 'Napaka pri pridobivanju podatkov za nadzorno ploščo'});
    }
});

// API routes for person equipment
server.get('/osebDelovnePostaje', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const username = req.query.username;
        if(!username){
            return res.status(400).json({error: 'Username parameter required'});
        }
        try {
            const result = await SQLquery(`SELECT OznakaDP AS 'Oznaka' FROM delovnapostaja WHERE OznakaOsebeUporabniskoIme = ? ORDER BY OznakaDP`, [username]);
            res.json(result);
        } catch (err) {
            res.status(500).json({error: 'Database error'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/osebMonitorji', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const username = req.query.username;
        if(!username){
            return res.status(400).json({error: 'Username parameter required'});
        }
        try {
            const result = await SQLquery(`SELECT OznakaMonitorja AS 'Oznaka' FROM monitor WHERE OznakaOsebeUporabniskoIme = ? ORDER BY OznakaMonitorja`, [username]);
            res.json(result);
        } catch (err) {
            res.status(500).json({error: 'Database error'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/osebTiskalniki', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const username = req.query.username;
        if(!username){
            return res.status(400).json({error: 'Username parameter required'});
        }
        try {
            const result = await SQLquery(`SELECT OznakaTiskalnika AS 'Oznaka' FROM tiskalnik WHERE OznakaOsebeUporabniskoIme = ? ORDER BY OznakaTiskalnika`, [username]);
            res.json(result);
        } catch (err) {
            res.status(500).json({error: 'Database error'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
    }
});

server.get('/osebRocniCitalci', async (req, res) => {
    if(req.session.loggedIn && req.session.D_PregledOpreme == 1){
        const username = req.query.username;
        if(!username){
            return res.status(400).json({error: 'Username parameter required'});
        }
        try {
            const result = await SQLquery(`SELECT OznakaRocnegaCitalca AS 'Oznaka' FROM rocnicitalec WHERE OznakaOsebeUporabniskoIme = ? ORDER BY OznakaRocnegaCitalca`, [username]);
            res.json(result);
        } catch (err) {
            res.status(500).json({error: 'Database error'});
        }
    } else {
        res.status(401).json({error: 'Not authenticated or insufficient permissions'});
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

function SQLqueryWithAppUser(appUser, SQLquery, params = []) {
    if (!appUser) {
        return Promise.reject(new Error('Missing app user for audited write query.'));
    }
    const resolvedUser = appUser;
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err);
                return;
            }

            connection.query('SET @app_user = ?', [resolvedUser], (setErr) => {
                if (setErr) {
                    connection.release();
                    reject(setErr);
                    return;
                }

                connection.query(SQLquery, params, (queryErr, results) => {
                    connection.release();
                    if (queryErr) {
                        reject(queryErr);
                    } else {
                        resolve(results);
                    }
                });
            });
        });
    });
}

function getAppUserOrRespond(req, res) {
    if (!req.session || !req.session.UporabniskoIme) {
        res.status(401).json({error: 'Missing app user for audited write query.'});
        return null;
    }
    return req.session.UporabniskoIme;
}