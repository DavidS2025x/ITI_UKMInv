/// <reference path="./main.js" />

/**
 * Obrazec za urejanje podatkov obstoječe osebe.
 * Ob nalaganju strani zapolni spustna menija za službo in enoto ter prednapolni polja
 * z obstoječimi vrednostmi osebe. Obravnava oddajo sprememb in reset obrazca.
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

            // Naloži seznam služb v spustni meni
            const sluzbe_promise = fetch('/sluzbaPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const sluzbaSelect = document.getElementById('Sluzba');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaSluzbe;
                    option.textContent = data.OznakaSluzbe + ' - ' + data.NazivSluzbe;
                    sluzbaSelect.appendChild(option);
                });
            });
            
            // Naloži seznam enot v spustni meni
            const enote_promise = fetch('/enotaPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const enotaSelect = document.getElementById('Enota');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaEnote;
                    option.textContent = data.OznakaEnote + ' - ' + data.NazivEnote;
                    enotaSelect.appendChild(option);
                });
            });

            // Naloži seznam lokacij v spustni meni
            const lokacije_promise = fetch('/lokacijaPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const lokacijaSelect = document.getElementById('OznakaLokacije');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaLokacije;
                    option.textContent = data.OznakaLokacije + ' - ' + data.NazivLokacije + (data.OznakaNadstropja ? ', ' + data.OznakaNadstropja : '');
                    lokacijaSelect.appendChild(option);
                });
            });

            const naslov = document.getElementById("naslov")
            naslov.innerText = "Uredi osebo";

            // Pridobi obstoječe podatke osebe iz seje in prednapolni polja obrazca
            fetch('/osebaPodatkiEdit')
            .then(response => response.json())
            .then( data => {
                window.UporabniskoIme = data.UporabniskoIme;
                window.Ime = data.Ime;
                window.Priimek = data.Priimek;
                window.InterniTelefoni = data.InterniTelefoni;
                window.MobilniTelefon = data.MobilniTelefon;
                window.ElektronskaPosta = data.ElektronskaPosta;
                window.OznakaSluzbe = data.OznakaSluzbe;
                window.OznakaEnote = data.OznakaEnote;
                window.OznakaLokacije = data.OznakaLokacije;

                // Počakaj da so vse možnosti naložene
                return Promise.all([sluzbe_promise, enote_promise, lokacije_promise]);
            })
            .then(() => {
                // Sedaj so vse možnosti naložene - nastavi vrednosti
                document.getElementById('UporabniskoIme').value = window.UporabniskoIme;
                document.getElementById('Ime').value = window.Ime;
                document.getElementById('Priimek').value = window.Priimek;
                document.getElementById('InterniTelefoni').value = window.InterniTelefoni;
                document.getElementById('MobilniTelefon').value = window.MobilniTelefon;
                document.getElementById('ElektronskaPosta').value = window.ElektronskaPosta;
                document.getElementById('Sluzba').value = window.OznakaSluzbe;
                document.getElementById('Enota').value = window.OznakaEnote;
                document.getElementById('OznakaLokacije').value = window.OznakaLokacije || '';
            })

            // Obravnava oddaje obrazca – zberi spremembe in pošlji POST na strežnik
            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const form = event.target;
                const payload = {
                    UporabniskoIme: form.UporabniskoIme.value,
                    Ime: form.Ime.value,
                    Priimek: form.Priimek.value,
                    InterniTelefoni: form.InterniTelefoni.value,
                    MobilniTelefon: form.MobilniTelefon.value,
                    ElektronskaPosta: form.ElektronskaPosta.value,
                    OznakaSluzbe: form.Sluzba.value,
                    OznakaEnote: form.Enota.value,
                    OznakaLokacije: form.OznakaLokacije.value,
                    ID: window.UporabniskoIme
                };
                fetch('/urediOsebo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (response.ok) {
                        showNotificationModal('Uspeh', 'Vnos uspešno spremenjen.', '/osebaPregled');
                    } else {
                        response.json().then(j => console.error(j)).catch(()=>{});
                        showNotificationModal('Napaka', 'Napaka pri spreminjanju vnosa.');
                    }
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    showNotificationModal('Napaka', 'Napaka pri dodajanju osebe.');
                });
            });

            // Obnovi vsa polja na izvorne vrednosti, pridobljene ob nalaganju strani
            document.addEventListener('reset', (e) => {
                e.preventDefault();
                document.getElementById('UporabniskoIme').value = window.UporabniskoIme;
                document.getElementById('Ime').value = window.Ime;
                document.getElementById('Priimek').value = window.Priimek;
                document.getElementById('InterniTelefoni').value = window.InterniTelefoni;
                document.getElementById('MobilniTelefon').value = window.MobilniTelefon;
                document.getElementById('ElektronskaPosta').value = window.ElektronskaPosta;
                document.getElementById('Sluzba').value = window.OznakaSluzbe;
                document.getElementById('Enota').value = window.OznakaEnote;
                document.getElementById('OznakaLokacije').value = window.OznakaLokacije || '';
            });
        });
