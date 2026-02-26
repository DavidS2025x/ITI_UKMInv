/// <reference path="./main.js" />

/**
 * Obrazec za urejanje obstoječega monitorja.
 * Ob nalaganju strani zapolni spustne menije iz strežnika ter prednapolni polja
 * z obstoječimi vrednostmi monitorja (pridobljene iz seja na strežniški strani).
 * Obravnava oddajo sprememb in vrnitev na izvorna stanja (reset).
 */
window.addEventListener("DOMContentLoaded", () => {
            uporabnikPodatki()
            .then(data => {
                // Update navbar with user info
                document.getElementById('username').textContent = data.Ime + ' ' + data.Priimek;
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
            fetch('/proizvajalecPodatkiForm')
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
            fetch('/tipNapravePodatkiForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaTipaNaprave');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaTipaNaprave;
                    option.textContent = data.OznakaTipaNaprave + ' - ' + data.OpisTipaNaprave;
                    input.appendChild(option);
                });
            });

            // Naloži seznam lokacij v spustni meni
            fetch('/lokacijaPodatkiForm')
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
            fetch('/osebaPodatkiForm')
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
            fetch('/sluzbaPodatkiForm')
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
            fetch('/enotaPodatkiForm')
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

            // Naloži seznam delovnih postaj za prireditev monitorju
            fetch('/delovnaPostajaPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaDP');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaDP;
                    option.textContent = data.OznakaDP;
                    input.appendChild(option);
                })
            })

            const naslov = document.querySelector('h1')
            naslov.innerText = "Uredi monitor";

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

            // Pridobi obstoječe podatke monitorja iz seje in prednapolni polja obrazca
            fetch('/monitorPodatkiEdit')
            .then(response => response.json())
            .then( data => {
                console.log('Raw data from server:', data);
                console.log('DatumProizvodnje before format:', data.DatumProizvodnje);
                console.log('DatumNakupa before format:', data.DatumNakupa);
                
                window.OznakaMonitorja = data.OznakaMonitorja;
                window.ModelMonitorja = data.ModelMonitorja;
                window.OznakaProizvajalca = data.OznakaProizvajalca;
                window.OznakaDP = data.OznakaDP;
                window.OznakaLokacije = data.OznakaLokacije;
                window.InventarnaStevilka = data.InventarnaStevilka;
                window.OznakaOsebeUporabniskoIme = data.OznakaOsebeUporabniskoIme;
                window.OznakaEnote = data.OznakaEnote;
                window.OznakaSluzbe = data.OznakaSluzbe;
                window.Velikost = data.Velikost;
                window.Kamera = data.Kamera;
                window.SerijskaStevilka = data.SerijskaStevilka;
                window.DatumProizvodnje = formatDateForInput(data.DatumProizvodnje);
                window.DatumNakupa = formatDateForInput(data.DatumNakupa);
                window.Opombe = data.Opombe;
                
                console.log('DatumProizvodnje after format:', window.DatumProizvodnje);
                console.log('DatumNakupa after format:', window.DatumNakupa);

                document.getElementById('OznakaMonitorja').value = window.OznakaMonitorja;
                document.getElementById('ModelMonitorja').value = window.ModelMonitorja;
                document.getElementById('OznakaProizvajalca').value = window.OznakaProizvajalca;
                document.getElementById('OznakaDP').value = window.OznakaDP;
                document.getElementById('OznakaLokacije').value = window.OznakaLokacije;
                document.getElementById('InventarnaStevilka').value = window.InventarnaStevilka;
                document.getElementById('OznakaOsebeUporabniskoIme').value = window.OznakaOsebeUporabniskoIme;
                document.getElementById('OznakaEnote').value = window.OznakaEnote;
                document.getElementById('OznakaSluzbe').value = window.OznakaSluzbe;
                document.getElementById('Velikost').value = window.Velikost;
                document.getElementById('Kamera').value = window.Kamera ? '1' : '0';
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
                    OznakaMonitorja: form.OznakaMonitorja.value,
                    ModelMonitorja: form.ModelMonitorja.value,
                    OznakaProizvajalca: form.OznakaProizvajalca.value,
                    OznakaDP: form.OznakaDP.value,
                    OznakaLokacije: form.OznakaLokacije.value,
                    InventarnaStevilka: form.InventarnaStevilka.value,
                    OznakaOsebeUporabniskoIme: form.OznakaOsebeUporabniskoIme.value,
                    OznakaEnote: form.OznakaEnote.value,
                    OznakaSluzbe: form.OznakaSluzbe.value,
                    Velikost: form.Velikost.value,
                    Kamera: form.Kamera.value,
                    SerijskaStevilka: form.SerijskaStevilka.value,
                    DatumProizvodnje: form.DatumProizvodnje.value,
                    DatumNakupa: form.DatumNakupa.value,
                    Opombe: form.Opombe.value,
                    ID: window.OznakaMonitorja
                };
                console.log(payload);
                fetch('/urediMonitor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (response.ok) {
                        alert('Monitor uspešno urejen!');
                        window.location.href = '/opremaPregled';
                    } else {
                        response.json().then(j => console.error(j)).catch(()=>{});
                        alert('Napaka pri urejanju monitorja.');
                    }
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    alert('Napaka pri urejanju monitorja.');
                });
            });

            // Obnovi vsa polja na izvorne vrednosti, pridobljene ob nalaganju strani
            document.addEventListener('reset', (e) => {
                e.preventDefault();
                document.getElementById('OznakaMonitorja').value = window.OznakaMonitorja;
                document.getElementById('ModelMonitorja').value = window.ModelMonitorja;
                document.getElementById('OznakaProizvajalca').value = window.OznakaProizvajalca;
                document.getElementById('OznakaDP').value = window.OznakaDP;
                document.getElementById('OznakaLokacije').value = window.OznakaLokacije;
                document.getElementById('InventarnaStevilka').value = window.InventarnaStevilka;
                document.getElementById('OznakaOsebeUporabniskoIme').value = window.OznakaOsebeUporabniskoIme;
                document.getElementById('OznakaEnote').value = window.OznakaEnote;
                document.getElementById('OznakaSluzbe').value = window.OznakaSluzbe;
                document.getElementById('Velikost').value = window.Velikost;
                document.getElementById('Kamera').value = window.Kamera;
                document.getElementById('SerijskaStevilka').value = window.SerijskaStevilka;
                document.getElementById('DatumProizvodnje').value = window.DatumProizvodnje;
                document.getElementById('DatumNakupa').value = window.DatumNakupa;
                document.getElementById('Opombe').value = window.Opombe;
            });
        });
