/// <reference path="./main.js" />

let actionUrl = '/izbrisDelovnaPostaja';
let currentButtonAction = '/delovnaPostajaVnos';
window.addButtonPermission = 'DODAJANJE_OPREME';



function izbrisiVnos(id, actionUrl){
    const deleteUrl = window.currentDeleteUrl || actionUrl;
    console.log(`Brisanje vnosa z ID: ${id} preko ${deleteUrl}`);
    
    // Save current search term before reload
    if (window.currentDataTable) {
        window.preservedTableSearch = window.currentDataTable.search();
    }
    
    fetch(`${deleteUrl}/`, {method: 'POST', body: JSON.stringify({"ID": id}), headers: {'Content-Type': 'application/json'}}).then(() => {
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
    
    // Save current search term before reload
    if (window.currentDataTable) {
        window.preservedTableSearch = window.currentDataTable.search();
    }
    
    fetch(unassignUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ID: id})
    }).then(response => {
        if (response.ok) {
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
                
                // Load the appropriate table based on hash or default
                loadTableByHash();
            }).catch(err => {
                console.error('Error loading user data:', err);
            });
        });

function switchEquipmentTable(hash) {
    if (window.location.hash === '#' + hash) {
        loadTableByHash();
        return;
    }
    window.location.hash = hash;
}

// Handle hash changes to load the appropriate table
function loadTableByHash() {
    const hash = window.location.hash.substring(1); // Remove the # character
    
    // Clear preserved search when switching tables
    window.preservedTableSearch = '';
    const searchInput = document.getElementById('tableSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    // Clear DataTable search if it exists
    if (window.currentDataTable) {
        window.currentDataTable.search('').draw();
    }
    
    switch(hash) {
        case 'delovnePostaje':
            currentButtonAction = '/delovnaPostajaVnos';
            tabelaDelovnePostaje('/delovnaPostajaPodatki', 'Delovne postaje');
            actionUrl = '/izbrisDelovnaPostaja';
            break;
        case 'monitorji':
            currentButtonAction = '/monitorVnos';
            tabelaMonitorji('/monitorPodatki', 'Monitorji');
            actionUrl = '/izbrisMonitor';
            break;
        case 'tiskalniki':
            currentButtonAction = '/tiskalnikVnos';
            tabelaTiskalniki('/tiskalnikPodatki', 'Tiskalniki');
            actionUrl = '/izbrisTiskalnik';
            break;
        case 'citalci':
            currentButtonAction = '/rocniCitalecVnos';
            tabelaCitalci('/rocnicitalecPodatki', 'Ročni čitalci');
            actionUrl = '/izbrisRocniCitalec';
            break;
        case 'vm':
            currentButtonAction = '/virtualServerVnos';
            tabela('/virtualServerPodatki', 'Virtualni strežniki');
            actionUrl = '/izbrisVirtualStreznik';
            removeAddButton();
            return;
        default:
            // Default to Delovne postaje if no hash is provided
            currentButtonAction = '/delovnaPostajaVnos';
            tabelaDelovnePostaje('/delovnaPostajaPodatki', 'Delovne postaje');
            actionUrl = '/izbrisDelovnaPostaja';
    }
    
    setUpAddButton();
}

// Listen for hash changes
window.addEventListener('hashchange', loadTableByHash);
