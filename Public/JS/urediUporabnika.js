/// <reference path="./main.js" />
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

            const naslov = document.getElementById("naslov")
            naslov.innerText = "Uredi uporabnika";

            fetch('/vlogaPodatki')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaVloge')
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaVloge;
                    option.innerText = data.NazivVloge;
                    input.appendChild(option);
                });
            });

            fetch('/uporabnikPodatkiEdit')
            .then(response => response.json())
            .then( data => {
                window.UporabniskoIme = data.UporabniskoIme;
                window.Ime = data.Ime;
                window.Priimek = data.Priimek;
                window.Geslo = data.Geslo;
                window.OznakaVloge = data.OznakaVloge;

                document.getElementById('UporabniskoIme').value = window.UporabniskoIme;
                document.getElementById('Ime').value = window.Ime;
                document.getElementById('Priimek').value = window.Priimek;
                document.getElementById('Geslo').value = window.Geslo;
                document.getElementById('OznakaVloge').value = window.OznakaVloge;
            })

            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const form = event.target;
                const payload = {
                    UporabniskoIme: form.UporabniskoIme.value,
                    Ime: form.Ime.value,
                    Priimek: form.Priimek.value,
                    Geslo: form.Geslo.value,
                    OznakaVloge: form.OznakaVloge.value,
                    ID: window.UporabniskoIme
                };
                fetch('/urediUporabnika', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (response.ok) {
                        alert('Uporabnik uspešno urejen!');
                        window.location.href = '/osebaPregled';
                    } else {
                        response.json().then(j => console.error(j)).catch(()=>{});
                        alert('Napaka pri urejanju uporabnika.');
                    }
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    alert('Napaka pri urejanju uporabnika.');
                });
            });

            document.addEventListener('reset', (e) => {
                e.preventDefault();
                document.getElementById('UporabniskoIme').value = window.UporabniskoIme;
                document.getElementById('Ime').value = window.Ime;
                document.getElementById('Priimek').value = window.Priimek;
                document.getElementById('Geslo').value = window.Geslo;
                document.getElementById('OznakaVloge').value = window.OznakaVloge;
            });
        });
