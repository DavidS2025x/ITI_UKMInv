/// <reference path="./main.js" />

/**
 * Obrazec za urejanje obstoječega sistemskega uporabnika.
 * Ob nalaganju strani zapolni spustni meni za vlogo in prednapolni polja
 * z obstoječimi vrednostmi uporabnika. Obravnava oddajo sprememb in reset obrazca.
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

            const naslov = document.getElementById("naslov")
            naslov.innerText = "Uredi uporabnika";

            const osebePoUporabniskemImenu = new Map();

            // Promise za nalaganje vlog
            const vloge_promise = fetch('/vlogaPodatki')
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

            // Pridobi obstoječe podatke sistemskega uporabnika in počakaj za vse fetche
            fetch('/uporabnikPodatkiEdit')
            .then(response => response.json())
            .then( data => {
                window.UporabniskoIme = data.UporabniskoIme;
                window.Ime = data.Ime;
                window.Priimek = data.Priimek;
                window.Geslo = data.Geslo;
                window.ID_Vloge = data.ID_Vloge;

                return Promise.all([
                    vloge_promise,
                    fetch(`/osebaZaUporabnikPodatkiForm?includeUsername=${encodeURIComponent(window.UporabniskoIme)}`)
                    .then(response => response.json())
                    .then(osebe => {
                        const input = document.getElementById('UporabniskoIme');
                        osebe.forEach(oseba => {
                            osebePoUporabniskemImenu.set(oseba.UporabniskoIme, oseba);
                            const option = document.createElement('option');
                            option.value = oseba.UporabniskoIme;
                            option.textContent = oseba.UporabniskoIme;
                            input.appendChild(option);
                        });
                    })
                ]);
            })
            .then(() => {
                // Sedaj so vse možnosti naložene - nastavi vrednosti
                const input = document.getElementById('UporabniskoIme');
                input.value = window.UporabniskoIme;
                input.disabled = true;
                document.getElementById('Ime').value = window.Ime;
                document.getElementById('Priimek').value = window.Priimek;
                document.getElementById('Geslo').value = window.Geslo;
                document.getElementById('ID_Vloge').value = window.ID_Vloge;
                
                // Prikaži zahteve za trenutno geslo
                updatePasswordValidationDisplay(window.Geslo, 'passwordRequirements');
            })

            // Ob izboru uporabniškega imena samodejno izpolni ime in priimek
            document.getElementById('UporabniskoIme').addEventListener('change', (event) => {
                const oseba = osebePoUporabniskemImenu.get(event.target.value);
                document.getElementById('Ime').value = oseba?.Ime || '';
                document.getElementById('Priimek').value = oseba?.Priimek || '';
            });

            // Ob vnosu gesla prikaži zahteve za varnost
            document.getElementById('Geslo').addEventListener('input', (event) => {
                updatePasswordValidationDisplay(event.target.value, 'passwordRequirements');
            });

            // Obravnava oddaje obrazca – zberi spremembe in pošlji POST na strežnik
            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const form = event.target;
                
                // Preveri, ali je geslo veljavno
                const geslo = form.Geslo.value;
                const isPasswordValid = updatePasswordValidationDisplay(geslo, 'passwordRequirements');
                
                if (!isPasswordValid) {
                    showNotificationModal('Napaka', 'Geslo ne izpolnjuje zahtev za varnost!');
                    form.Geslo.focus();
                    return;
                }
                
                const payload = {
                    Geslo: form.Geslo.value,
                    ID_Vloge: form.ID_Vloge.value,
                    ID: window.UporabniskoIme
                };
                fetch('/urediUporabnika', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (response.ok) {
                        showNotificationModal('Uspeh', 'Uporabnik uspešno urejen!', '/osebaPregled');
                    } else {
                        response.json().then(j => console.error(j)).catch(()=>{});
                        showNotificationModal('Napaka', 'Napaka pri urejanju uporabnika.');
                    }
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    showNotificationModal('Napaka', 'Napaka pri urejanju uporabnika.');
                });
            });

            // Obnovi vsa polja na izvorne vrednosti, pridobljene ob nalaganju strani
            document.addEventListener('reset', (e) => {
                e.preventDefault();
                document.getElementById('UporabniskoIme').value = window.UporabniskoIme;
                document.getElementById('Ime').value = window.Ime;
                document.getElementById('Priimek').value = window.Priimek;
                document.getElementById('Geslo').value = window.Geslo;
                document.getElementById('ID_Vloge').value = window.ID_Vloge;
                document.getElementById('Geslo').classList.remove('password-invalid');
                // Prikaži zahteve za trenutno geslo
                updatePasswordValidationDisplay(window.Geslo, 'passwordRequirements');
            });
        });
