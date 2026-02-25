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

            fetch('/operacijskiSistemPodatkiForm')
            .then(response => response.json())
            .then(data => {
                const input = document.getElementById('OznakaOS');
                data.forEach(data => {
                    const option = document.createElement('option');
                    option.value = data.OznakaOS;
                    option.textContent = data.OznakaOS + ' - ' + data.KategorijaOS;
                    input.appendChild(option);
                });
            });

            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const form = event.target;
                const payload = {
                    OznakaDP: form.OznakaDP.value,
                    ModelDP: form.ModelDP.value,
                    OznakaProizvajalca: form.OznakaProizvajalca.value,
                    OznakaTipaNaprave: form.OznakaTipaNaprave.value,
                    OznakaLokacije: form.OznakaLokacije.value,
                    InventarnaStevilka: form.InventarnaStevilka.value,
                    OznakaOsebeUporabniskoIme: form.OznakaOsebeUporabniskoIme.value,
                    OznakaEnote: form.OznakaEnote.value,
                    OznakaSluzbe: form.OznakaSluzbe.value,
                    OznakaOS: form.OznakaOS.value,
                    CPU: form.CPU.value,
                    RAM: form.RAM.value,
                    DiskC: form.DiskC.value,
                    DiskD: form.DiskD.value,
                    SerijskaStevilka: form.SerijskaStevilka.value,
                    DatumProizvodnje: form.DatumProizvodnje.value,
                    DatumNakupa: form.DatumNakupa.value,
                    Opombe: form.Opombe.value
                };
                fetch(form.action, {
                    method: form.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (response.ok) {
                        alert('Delovna postaja uspešno dodana!');
                        form.reset();
                    } else {
                        response.json().then(j => console.error(j)).catch(()=>{});
                        alert('Napaka pri dodajanju delovne postaje.');
                    }
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    alert('Napaka pri dodajanju delovne postaje.');
                });
            });
        });
