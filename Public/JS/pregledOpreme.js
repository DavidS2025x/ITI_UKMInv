/// <reference path="./main.js" />

let actionUrl = '/izbrisDelovnaPostaja';
let currentButtonAction = '/delovnaPostajaVnos';
window.addButtonPermission = 'DODAJANJE_OPREME';



function izbrisiVnos(id, actionUrl){
    const deleteUrl = window.currentDeleteUrl || actionUrl;
    console.log(`Brisanje vnosa z ID: ${id} preko ${deleteUrl}`);
    fetch(`${deleteUrl}/`, {method: 'POST', body: JSON.stringify({"ID": id}), headers: {'Content-Type': 'application/json'}}).then(() => {
        if (window.currentDataTable) {
            window.currentDataTable.search('').draw(); // Clear filter/search
        }
        const searchInput = document.getElementById('tableSearch');
        if (searchInput) searchInput.value = '';
        if (typeof window.currentTableReload === 'function') {
            window.currentTableReload();
        } else {
            tabelaDelovnePostaje('/delovnaPostajaPodatki', 'Delovne postaje');
        }
    });
}

function oznaciKotNerazporejeno(id) {
    const unassignUrl = window.currentUnassignUrl || '/nerazporejenaDelovnaPostaja';
    const label = window.currentUnassignLabel || 'delovne postaje';
    console.log(`Označevanje ${label} kot nerazporejene: ${id}`);
    fetch(unassignUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ID: id})
    }).then(response => {
        if (response.ok) {
            if (window.currentDataTable) {
                window.currentDataTable.search('').draw(); // Clear filter/search
            }
            const searchInput = document.getElementById('tableSearch');
            if (searchInput) searchInput.value = '';
            if (typeof window.currentTableReload === 'function') {
                window.currentTableReload();
            } else {
                tabelaDelovnePostaje('/delovnaPostajaPodatki', 'Delovne postaje');
            }
        } else {
            alert(`Napaka pri odstranitvi uporabnika z ${label}.`);
        }
    }).catch(error => {
        console.error('Error:', error);
        alert(`Napaka pri odstranitvi uporabnika z ${label}.`);
    });
}

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
                currentButtonAction = '/delovnaPostajaVnos';
                tabelaDelovnePostaje('/delovnaPostajaPodatki', 'Delovne postaje');
            }).catch(err => {
                console.error('Error loading user data:', err);
            });
        });
