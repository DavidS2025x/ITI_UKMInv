/// <reference path="./main.js" />

/**
 * Obrazec za urejanje obstoječe delovne postaje.
 * Ob nalaganju strani zapolni spustne menije iz strežnika ter prednapolni polja
 * z obstoječimi vrednostmi naprave (pridobljene iz seja stranje na strežniški strani).
 * Obravnava oddajo sprememb in vrnitev na izvorna stanja (reset).
 */
window.addEventListener("DOMContentLoaded", () => {
            uporabnikPodatki()
            .then(data => {
                // Update navbar with user info
                updateUserDisplay(data);
                // Generate action buttons based on permissions
                addNavigationLinks(data)
                .then(() => {
                    const currentWindow = window.location.pathname.split('/').pop();
                    const links = document.querySelectorAll('#navLinksContainer .nav-link');
                    links.forEach(link => {
                        if (link.getAttribute('href').includes(currentWindow)) {
                            link.classList.add('active');
                        }
                    });
                });
            }).catch(err => {
                console.error('Error loading user data:', err);
            });

            // Naloži seznam proizvajalcev v spustni meni
            const proizvajalci_promise = fetch('/proizvajalecPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaProizvajalca');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaProizvajalca;
                    option.textContent = data.OznakaProizvajalca + ' - ' + data.NazivProizvajalca;
                    input.appendChild(option);
                });
            });

            // Naloži seznam tipov naprav v spustni meni
            const tipiNaprav_promise = fetch('/tipNapravePodatkiForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaTipaNaprave');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaTipaNaprave;
                    option.textContent = data.OpisTipaNaprave + ' - ' + data.OznakaKategorijeNaprave;
                    input.appendChild(option);
                });
            });

            // Naloži seznam lokacij v spustni meni
            const lokacije_promise = fetch('/lokacijaPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaLokacije');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaLokacije;
                    option.textContent = data.OznakaLokacije + ' - ' + data.NazivLokacije;
                    input.appendChild(option);
                });
            });

            // Naloži seznam oseb (dodeljeni uporabnik) v spustni meni
            const osebe_promise = fetch('/osebaPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaOsebeUporabniskoIme');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.UporabniskoIme;
                    option.textContent = data.UporabniskoIme + ' - ' + data.Ime;
                    input.appendChild(option);
                });
            });

            // Naloži seznam služb v spustni meni
            const sluzbe_promise = fetch('/sluzbaPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaSluzbe');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaSluzbe;
                    option.textContent = data.OznakaSluzbe + ' - ' + data.NazivSluzbe;
                    input.appendChild(option);
                });
            });
            
            // Naloži seznam enot v spustni meni
            const enote_promise = fetch('/enotaPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaEnote');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaEnote;
                    option.textContent = data.OznakaEnote + ' - ' + data.NazivEnote;
                    input.appendChild(option);
                });
            });

            // Naloži seznam operacijskih sistemov v spustni meni
            const operacijskiSistemi_promise = fetch('/operacijskiSistemPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaOS');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaOS;
                    option.innerText = data.OznakaOS;
                    input.appendChild(option);
                });
            });

            const naslov = document.querySelector('h1')
            naslov.innerText = "Uredi delovno postajo";

            /**
             * Pretvori datumski niz v obliko 'YYYY-MM-DD', primerno za vrednost <input type="date">.
             * @param {string} dateString - Datumski niz v obliki ISO ali 'YYYY-MM-DD HH:MM:SS'.
             * @returns {string} Samo datum brez časa ali prazen niz.
             */
            function formatDateForInput(dateString) {
                if (!dateString) return '';
                // Handle "YYYY-MM-DD HH:MM:SS" (MySQL dateStrings), ISO "YYYY-MM-DDT..." and plain "YYYY-MM-DD"
                return dateString.split('T')[0].split(' ')[0];
            }

            // Pridobi obstoječe podatke delovne postaje iz seje in prednapolni polja obrazca
            fetch('/delovnaPostajaPodatkiEdit')
            .then(response => response.json())
            .then( data => {
                console.log('Raw data from server:', data);
                console.log('DatumProizvodnje before format:', data.DatumProizvodnje);
                console.log('DatumNakupa before format:', data.DatumNakupa);
                
                window.OznakaDP = data.OznakaDP;
                window.ModelDP = data.ModelDP;
                window.OznakaProizvajalca = data.OznakaProizvajalca;
                window.OznakaTipaNaprave = data.OznakaTipaNaprave;
                window.OznakaLokacije = data.OznakaLokacije;
                window.InventarnaStevilka = data.InventarnaStevilka;
                window.OznakaOsebeUporabniskoIme = data.OznakaOsebeUporabniskoIme || ' ';
                window.OznakaEnote = data.OznakaEnote;
                window.OznakaSluzbe = data.OznakaSluzbe;
                window.OznakaOS = data.OznakaOS;
                window.CPU = data.CPU;
                window.RAM = data.RAM;
                window.DiskC = data.DiskC;
                window.DiskD = data.DiskD;
                window.SerijskaStevilka = data.SerijskaStevilka;
                window.DatumProizvodnje = formatDateForInput(data.DatumProizvodnje);
                window.DatumNakupa = formatDateForInput(data.DatumNakupa);
                window.Opombe = data.Opombe;
                
                console.log('DatumProizvodnje after format:', window.DatumProizvodnje);
                console.log('DatumNakupa after format:', window.DatumNakupa);

                // Počakaj da so vse možnosti naložene pred nastavitvijo vrednosti
                return Promise.all([
                    proizvajalci_promise,
                    tipiNaprav_promise,
                    lokacije_promise,
                    osebe_promise,
                    sluzbe_promise,
                    enote_promise,
                    operacijskiSistemi_promise
                ]);
            })
            .then(() => {
                // Sedaj so vse možnosti naložene - nastavi vrednosti
                document.getElementById('OznakaDP').value = window.OznakaDP;
                document.getElementById('ModelDP').value = window.ModelDP;
                document.getElementById('OznakaProizvajalca').value = window.OznakaProizvajalca;
                document.getElementById('OznakaTipaNaprave').value = window.OznakaTipaNaprave;
                document.getElementById('OznakaLokacije').value = window.OznakaLokacije;
                document.getElementById('InventarnaStevilka').value = window.InventarnaStevilka;
                document.getElementById('OznakaOsebeUporabniskoIme').value = window.OznakaOsebeUporabniskoIme;
                document.getElementById('OznakaEnote').value = window.OznakaEnote;
                document.getElementById('OznakaSluzbe').value = window.OznakaSluzbe;
                document.getElementById('OznakaOS').value = window.OznakaOS;
                document.getElementById('CPU').value = window.CPU;
                document.getElementById('RAM').value = window.RAM;
                document.getElementById('DiskC').value = window.DiskC;
                document.getElementById('DiskD').value = window.DiskD;
                document.getElementById('SerijskaStevilka').value = window.SerijskaStevilka;
                document.getElementById('DatumProizvodnje').value = window.DatumProizvodnje;
                document.getElementById('DatumNakupa').value = window.DatumNakupa;
                document.getElementById('Opombe').value = window.Opombe;
            })

            // Obravnava oddaje obrazca – zberi spremembe in pošlji POST na strežnik
            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const form = event.target;
                const payload = {
                    OznakaDP: form.OznakaDP.value,
                    ModelDP: form.ModelDP.value,
                    OznakaProizvajalca: form.OznakaProizvajalca.value,
                    OznakaTipaNaprave: form.OznakaTipaNaprave.value,
                    OznakaLokacije: form.OznakaLokacije.value,
                    InventarnaStevilka: form.InventarnaStevilka.value,
                    OznakaOsebeUporabniskoIme: form.OznakaOsebeUporabniskoIme.value,
                    OznakaEnote: form.OznakaEnote.value,
                    OznakaSluzbe: form.OznakaSluzbe.value,
                    OznakaOS: form.OznakaOS.value,
                    CPU: form.CPU.value,
                    RAM: form.RAM.value,
                    DiskC: form.DiskC.value,
                    DiskD: form.DiskD.value,
                    SerijskaStevilka: form.SerijskaStevilka.value,
                    DatumProizvodnje: form.DatumProizvodnje.value,
                    DatumNakupa: form.DatumNakupa.value,
                    Opombe: form.Opombe.value,
                    ID: window.OznakaDP
                };
                fetch('/urediDelovnaPostaja', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (response.ok) {
                        showNotificationModal('Uspeh', 'Delovna postaja uspešno urejena!', '/opremaPregled#delovnePostaje');
                    } else {
                        response.json().then(j => console.error(j)).catch(()=>{});
                        showNotificationModal('Napaka', 'Napaka pri urejanju delovne postaje.');
                    }
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    showNotificationModal('Napaka', 'Napaka pri urejanju delovne postaje.');
                });
            });

            // Obnovi vsa polja na izvorne vrednosti, pridobljene ob nalaganju strani
            document.addEventListener('reset', (e) => {
                e.preventDefault();
                document.getElementById('OznakaDP').value = window.OznakaDP;
                document.getElementById('ModelDP').value = window.ModelDP;
                document.getElementById('OznakaProizvajalca').value = window.OznakaProizvajalca;
                document.getElementById('OznakaTipaNaprave').value = window.OznakaTipaNaprave;
                document.getElementById('OznakaLokacije').value = window.OznakaLokacije;
                document.getElementById('InventarnaStevilka').value = window.InventarnaStevilka;
                document.getElementById('OznakaOsebeUporabniskoIme').value = window.OznakaOsebeUporabniskoIme;
                document.getElementById('OznakaEnote').value = window.OznakaEnote;
                document.getElementById('OznakaSluzbe').value = window.OznakaSluzbe;
                document.getElementById('OznakaOS').value = window.OznakaOS;
                document.getElementById('CPU').value = window.CPU;
                document.getElementById('RAM').value = window.RAM;
                document.getElementById('DiskC').value = window.DiskC;
                document.getElementById('DiskD').value = window.DiskD;
                document.getElementById('SerijskaStevilka').value = window.SerijskaStevilka;
                document.getElementById('DatumProizvodnje').value = window.DatumProizvodnje;
                document.getElementById('DatumNakupa').value = window.DatumNakupa;
                document.getElementById('Opombe').value = window.Opombe;
            });
        });
