/// <reference path="./main.js" />

let actionUrl = '/izbrisOseba';
let currentButtonAction = '/osebaVnos';
window.addButtonPermission = 'D_UrejanjeUporabnikov';

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
            // Load initial table after user data is available
            currentButtonAction = '/osebaVnos';
            tabelaOsebe('/osebaPodatki', 'Osebe');
        }).catch(err => {
            console.error('Error loading user data:', err);
        });
    });

function izbrisiVnos(id, actionUrl){
    console.log(`Brisanje vnosa z ID: ${id} preko ${actionUrl}`);
    fetch(`${actionUrl}/`, {method: 'POST', body: JSON.stringify({"ID": id}), headers: {'Content-Type': 'application/json'}}).then(() => {
        currentButtonAction = '/osebaVnos';
        tabelaOsebe('/osebaPodatki', 'Osebe');
    });
}
