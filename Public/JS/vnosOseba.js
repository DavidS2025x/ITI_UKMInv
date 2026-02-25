/// <reference path="./main.js" />

/**
 * Obrazec za dodajanje nove osebe (zaposleni/oseba v sistemu).
 * Ob nalaganju strani zapolni spustna menija za službo in enoto ter obravnava oddajo obrazca.
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

            // Naloži seznam služb v spustni meni
            fetch('/sluzbaPodatkiForm')
            .then(response => response.json())
            .then(data => {
                console.log(data);
                const sluzbaSelect = document.getElementById('Sluzba');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaSluzbe;
                    option.textContent = data.OznakaSluzbe + ' - ' + data.NazivSluzbe;
                    sluzbaSelect.appendChild(option);
                });
            });
            
            // Naloži seznam enot v spustni meni
            fetch('/enotaPodatkiForm')
            .then(response => response.json())
            .then(data => {
                console.log(data);
                const enotaSelect = document.getElementById('Enota');
                data.forEach(data => {
                    console.log(data);
                    const option = document.createElement('option');
                    option.value = data.OznakaEnote;
                    option.textContent = data.OznakaEnote + ' - ' + data.NazivEnote;
                    enotaSelect.appendChild(option);
                });
            });

            // Obravnava oddaje obrazca – zberi polja in pošlji POST zahtevo na strežnik
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
                    OznakaEnote: form.Enota.value
                };
                fetch(form.action, {
                    method: form.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (response.ok) {
                        alert('Oseba uspešno dodana!');
                        form.reset();
                    } else {
                        response.json().then(j => console.error(j)).catch(()=>{});
                        alert('Napaka pri dodajanju osebe.');
                    }
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    alert('Napaka pri dodajanju osebe.');
                });
            });
        });
