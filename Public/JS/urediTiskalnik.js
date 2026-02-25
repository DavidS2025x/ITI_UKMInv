/// <reference path="./main.js" />

/**
 * Obrazec za urejanje obstoječega tiskalnika.
 * Ob nalaganju strani zapolni spustne menije ter prednapolni polja z obstoječimi vrednostmi
 * tiskalnika (pridobljene iz seja na strežniški strani).
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

            // Naloži seznam tipov tiskalnikov v spustni meni
            fetch('/tipTiskalnikaForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaTipaTiskalnika');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaTipaTiskalnika;
                    option.textContent = data.OznakaTipaTiskalnika + ' - ' + data.OpisTipaTiskalnika;
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

            // Naloži seznam delovnih postaj za prireditev tiskalniku
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
            naslov.innerText = "Uredi tiskalnik";

            /**
             * Pretvori datumski niz v obliko 'YYYY-MM-DD', primerno za vrednost <input type="date">.
             * @param {string} dateString - Datumski niz v obliki ISO ali 'YYYY-MM-DD HH:MM:SS'.
             * @returns {string} Samo datum brez časa ali prazen niz.
             */
            function formatDateForInput(dateString) {
                if (!dateString) return '';
                // Handle both "YYYY-MM-DD HH:MM:SS" and "YYYY-MM-DD" formats
                const dateOnly = dateString.split('T')[0] || dateString.split(' ')[0];
                return dateOnly;
            }

            // Pridobi obstoječe podatke tiskalnika iz seje in prednapolni polja obrazca
            fetch('/tiskalnikPodatkiEdit')
            .then(response => response.json())
            .then( data => {
                console.log('Raw data from server:', data);
                console.log('DatumProizvodnje before format:', data.DatumProizvodnje);
                console.log('DatumNakupa before format:', data.DatumNakupa);
                
                window.OznakaTiskalnika = data.OznakaTiskalnika;
                window.ModelTiskalnika = data.ModelTiskalnika;
                window.OznakaProizvajalca = data.OznakaProizvajalca;
                window.OznakaTipaTiskalnika = data.OznakaTipaTiskalnika;
                window.OznakaDP = data.OznakaDP;
                window.OznakaLokacije = data.OznakaLokacije;
                window.InventarnaStevilka = data.InventarnaStevilka;
                window.OznakaOsebeUporabniskoIme = data.OznakaOsebeUporabniskoIme;
                window.OznakaEnote = data.OznakaEnote;
                window.OznakaSluzbe = data.OznakaSluzbe;
                window.IP = data.IP;
                window.TiskalniskaVrsta = data.TiskalniskaVrsta;
                window.SerijskaStevilka = data.SerijskaStevilka;
                window.ProduktnaStevilka = data.ProduktnaStevilka;
                window.DatumProizvodnje = formatDateForInput(data.DatumProizvodnje);
                window.DatumNakupa = formatDateForInput(data.DatumNakupa);
                window.Opombe = data.Opombe;
                
                console.log('DatumProizvodnje after format:', window.DatumProizvodnje);
                console.log('DatumNakupa after format:', window.DatumNakupa);

                document.getElementById('OznakaTiskalnika').value = window.OznakaTiskalnika;
                document.getElementById('ModelTiskalnika').value = window.ModelTiskalnika;
                document.getElementById('OznakaProizvajalca').value = window.OznakaProizvajalca;
                document.getElementById('OznakaTipaTiskalnika').value = window.OznakaTipaTiskalnika;
                document.getElementById('OznakaDP').value = window.OznakaDP;
                document.getElementById('OznakaLokacije').value = window.OznakaLokacije;
                document.getElementById('InventarnaStevilka').value = window.InventarnaStevilka;
                document.getElementById('OznakaOsebeUporabniskoIme').value = window.OznakaOsebeUporabniskoIme;
                document.getElementById('OznakaEnote').value = window.OznakaEnote;
                document.getElementById('OznakaSluzbe').value = window.OznakaSluzbe;
                document.getElementById('IP').value = window.IP;
                document.getElementById('TiskalniskaVrsta').value = window.TiskalniskaVrsta;
                document.getElementById('SerijskaStevilka').value = window.SerijskaStevilka;
                document.getElementById('ProduktnaStevilka').value = window.ProduktnaStevilka;
                document.getElementById('DatumProizvodnje').value = window.DatumProizvodnje;
                document.getElementById('DatumNakupa').value = window.DatumNakupa;
                document.getElementById('Opombe').value = window.Opombe;
            })

            // Obravnava oddaje obrazca – zberi spremembe in pošlji POST na strežnik
            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const form = event.target;
                const payload = {
                    OznakaTiskalnika: form.OznakaTiskalnika.value,
                    ModelTiskalnika: form.ModelTiskalnika.value,
                    OznakaProizvajalca: form.OznakaProizvajalca.value,
                    OznakaTipaTiskalnika: form.OznakaTipaTiskalnika.value,
                    OznakaDP: form.OznakaDP.value,
                    OznakaLokacije: form.OznakaLokacije.value,
                    InventarnaStevilka: form.InventarnaStevilka.value,
                    OznakaOsebeUporabniskoIme: form.OznakaOsebeUporabniskoIme.value,
                    OznakaEnote: form.OznakaEnote.value,
                    OznakaSluzbe: form.OznakaSluzbe.value,
                    IP: form.IP.value,
                    TiskalniskaVrsta: form.TiskalniskaVrsta.value,
                    SerijskaStevilka: form.SerijskaStevilka.value,
                    ProduktnaStevilka: form.ProduktnaStevilka.value,
                    DatumProizvodnje: form.DatumProizvodnje.value,
                    DatumNakupa: form.DatumNakupa.value,
                    Opombe: form.Opombe.value,
                    ID: window.OznakaTiskalnika
                };
                console.log(payload);
                fetch('/urediTiskalnik', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                }).then(response => response.json())
                .then(data => {
                    if(data.success) {
                        alert(data.message);
                        window.location.href = '/opremaPregled';
                    } else {
                        alert(data.message);
                    }
                });
            });

            // Obnovi vsa polja na izvorne vrednosti, pridobljene ob nalaganju strani
            document.addEventListener('reset', (event) => {
                setTimeout(() => {
                    document.getElementById('OznakaTiskalnika').value = window.OznakaTiskalnika;
                    document.getElementById('ModelTiskalnika').value = window.ModelTiskalnika;
                    document.getElementById('OznakaProizvajalca').value = window.OznakaProizvajalca;
                    document.getElementById('OznakaTipaTiskalnika').value = window.OznakaTipaTiskalnika;
                    document.getElementById('OznakaDP').value = window.OznakaDP;
                    document.getElementById('OznakaLokacije').value = window.OznakaLokacije;
                    document.getElementById('InventarnaStevilka').value = window.InventarnaStevilka;
                    document.getElementById('OznakaOsebeUporabniskoIme').value = window.OznakaOsebeUporabniskoIme;
                    document.getElementById('OznakaEnote').value = window.OznakaEnote;
                    document.getElementById('OznakaSluzbe').value = window.OznakaSluzbe;
                    document.getElementById('IP').value = window.IP;
                    document.getElementById('TiskalniskaVrsta').value = window.TiskalniskaVrsta;
                    document.getElementById('SerijskaStevilka').value = window.SerijskaStevilka;
                    document.getElementById('ProduktnaStevilka').value = window.ProduktnaStevilka;
                    document.getElementById('DatumProizvodnje').value = window.DatumProizvodnje;
                    document.getElementById('DatumNakupa').value = window.DatumNakupa;
                    document.getElementById('Opombe').value = window.Opombe;
                }, 0);
            });
});
