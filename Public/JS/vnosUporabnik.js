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

            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const form = event.target;
                const payload = {
                    UporabniskoIme: form.UporabniskoIme.value,
                    Ime: form.Ime.value,
                    Priimek: form.Priimek.value,
                    Geslo: form.Geslo.value,
                    OznakaVloge: form.OznakaVloge.value
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
