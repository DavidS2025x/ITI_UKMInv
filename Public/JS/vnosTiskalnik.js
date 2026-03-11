/// <reference path="./main.js" />

/**
 * Obrazec za dodajanje novega tiskalnika.
 * Ob nalaganju strani zapolni spustne menije (proizvajalci, tipi tiskalnikov, lokacije,
 * osebe, službe, enote, delovne postaje) in obravnava oddajo obrazca.
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
                    option.textContent = data.OpisTipaNaprave + ' - ' + data.OznakaKategorijeNaprave;
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
                    option.textContent = data.OznakaLokacije + ' - ' + data.NazivLokacije + (data.OznakaNadstropja ? ', ' + data.OznakaNadstropja : '');
                    input.appendChild(option);
                });
            });

            // Naloži seznam tipov tiskalnikov v spustni meni
            fetch('/tipTiskalnikaForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaTipaTiskalnika')
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaTipaTiskalnika;
                    option.textContent = data.OznakaTipaTiskalnika + ' - ' + data.OpisTipaTiskalnika;
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

            // Obravnava oddaje obrazca – zberi polja in pošlji POST zahtevo na strežnik
            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const form = event.target;
                const payload = {
                    OznakaTiskalnika: form.OznakaTiskalnika.value,
                    ModelTiskalnika: form.ModelTiskalnika.value,
                    OznakaProizvajalca: form.OznakaProizvajalca.value,
                    OznakaTipaNaprave: form.OznakaTipaNaprave.value,
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
                    Opombe: form.Opombe.value
                };
                console.log(payload);
                fetch(form.action, {
                    method: form.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (response.ok) {
                        showNotificationModal('Uspeh', 'Tiskalnik uspešno dodan!', '/opremaPregled#tiskalniki');
                    } else {
                        response.json().then(j => console.error(j)).catch(()=>{});
                        showNotificationModal('Napaka', 'Napaka pri dodajanju tiskalnika.');
                    }
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    showNotificationModal('Napaka', 'Napaka pri dodajanju tiskalnika.');
                });
            });
        });
