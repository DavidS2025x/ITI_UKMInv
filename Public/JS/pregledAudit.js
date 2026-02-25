/// <reference path="./main.js" />

window.disableAddButton = true;

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
        tabela('/auditPodatki', null, 'desc');
    });
