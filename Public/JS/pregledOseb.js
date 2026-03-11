/// <reference path="./main.js" />

let actionUrl = '/izbrisOseba';
let currentButtonAction = '/osebaVnos';
window.addButtonPermission = 'UREJANJE_UPORABNIKOV';

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
            // Load initial table after user data is available
            loadPeopleTableByHash();
        }).catch(err => {
            console.error('Error loading user data:', err);
        });
    });

function switchPeopleTable(hash) {
    if (window.location.hash === '#' + hash) {
        loadPeopleTableByHash();
        return;
    }
    window.location.hash = hash;
}

function loadPeopleTableByHash() {
    const hash = window.location.hash.substring(1);

    window.preservedTableSearch = '';
    const searchInput = document.getElementById('tableSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    if (window.currentDataTable) {
        window.currentDataTable.search('').draw();
    }

    switch (hash) {
        case 'uporabniki':
            currentButtonAction = '/uporabnikVnos';
            tabelaUporabniki('/uporabnikPodatki', 'Uporabniki');
            actionUrl = '/izbrisUporabnik';
            break;
        case 'osebe':
        default:
            currentButtonAction = '/osebaVnos';
            tabelaOsebe('/osebaPodatki', 'Osebe');
            actionUrl = '/izbrisOseba';
            break;
    }

    setUpAddButton();
}

window.addEventListener('hashchange', loadPeopleTableByHash);

function izbrisiVnos(id, actionUrl){
    console.log(`Brisanje vnosa z ID: ${id} preko ${actionUrl}`);
    
    // Save current search term before reload
    if (window.currentDataTable) {
        window.preservedTableSearch = window.currentDataTable.search();
    }
    
    fetch(`${actionUrl}/`, {method: 'POST', body: JSON.stringify({"ID": id}), headers: {'Content-Type': 'application/json'}}).then(() => {
        if (typeof window.currentTableReload === 'function') {
            window.currentTableReload();
        } else {
            loadPeopleTableByHash();
        }
    });
}
