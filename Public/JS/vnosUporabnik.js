/// <reference path="./main.js" />

/**
 * Obrazec za dodajanje novega sistemskega uporabnika.
 * Ob nalaganju strani zapolni spustni meni za vlogo in obravnava oddajo obrazca.
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

            const osebePoUporabniskemImenu = new Map();

            // Naloži seznam oseb, ki še nimajo sistemskega uporabnika
            fetch('/osebaZaUporabnikPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('UporabniskoIme');
                data.forEach(oseba => {
                    osebePoUporabniskemImenu.set(oseba.UporabniskoIme, oseba);
                    const option = document.createElement('option');
                    option.value = oseba.UporabniskoIme;
                    option.textContent = oseba.UporabniskoIme;
                    input.appendChild(option);
                });
            });

            // Naloži seznam vlog v spustni meni
            fetch('/vlogaPodatki')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('ID_Vloge')
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.ID_Vloge;
                    option.innerText = data.NazivVloge;
                    input.appendChild(option);
                });
            });

            // Ob izboru uporabniškega imena samodejno izpolni ime in priimek
            document.getElementById('UporabniskoIme').addEventListener('change', (event) => {
                const oseba = osebePoUporabniskemImenu.get(event.target.value);
                document.getElementById('Ime').value = oseba?.Ime || '';
                document.getElementById('Priimek').value = oseba?.Priimek || '';
            });

            // Prikaži zahteve za geslo že ob nalaganju strani
            updatePasswordValidationDisplay('', 'passwordRequirements');

            // Ob vnosu gesla prikaži zahteve za varnost
            document.getElementById('Geslo').addEventListener('input', (event) => {
                updatePasswordValidationDisplay(event.target.value, 'passwordRequirements');
            });

            // Obravnava oddaje obrazca – zberi polja in pošlji POST zahtevo na strežnik
            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const form = event.target;
                
                // Preveri, ali je geslo veljavno
                const geslo = form.Geslo.value;
                const isPasswordValid = updatePasswordValidationDisplay(geslo, 'passwordRequirements');
                
                if (!isPasswordValid) {
                    alert('Geslo ne izpolnjuje zahtev za varnost!');
                    form.Geslo.focus();
                    return;
                }
                
                const payload = {
                    UporabniskoIme: form.UporabniskoIme.value,
                    Ime: document.getElementById('Ime').value,
                    Priimek: document.getElementById('Priimek').value,
                    Geslo: form.Geslo.value,
                    ID_Vloge: form.ID_Vloge.value
                };
                fetch(form.action, {
                    method: form.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (response.ok) {
                        alert('Uporabnik uspešno dodan!');
                        form.reset();
                        document.getElementById('passwordRequirements').innerHTML = '';
                    } else {
                        response.json().then(j => console.error(j)).catch(()=>{});
                        alert('Napaka pri dodajanju uporabnika.');
                    }
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    alert('Napaka pri dodajanju uporabnika.');
                });
            });

            // Ponastavljanje obrazca – prikaži zahteve za prazno geslo
            document.addEventListener('reset', (e) => {
                updatePasswordValidationDisplay('', 'passwordRequirements');
                document.getElementById('Geslo').classList.remove('password-invalid');
            });
        });
