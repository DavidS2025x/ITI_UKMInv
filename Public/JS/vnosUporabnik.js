/// <reference path="./main.js" />

/**
 * Obrazec za dodajanje novega sistemskega uporabnika.
 * Ob nalaganju strani zapolni spustni meni za vlogo in obravnava oddajo obrazca.
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

            // Obravnava oddaje obrazca – zberi polja in pošlji POST zahtevo na strežnik
            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const form = event.target;
                const payload = {
                    UporabniskoIme: form.UporabniskoIme.value,
                    Ime: form.Ime.value,
                    Priimek: form.Priimek.value,
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
        });
