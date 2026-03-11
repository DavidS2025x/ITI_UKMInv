/// <reference path="./main.js" />
let actionUrl = '';
let currentButtonAction = '';
window.disableAddButton = true;

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
            loadCodebookByHash();
        });

function switchCodebookTable(hash) {
    if (window.location.hash === '#' + hash) {
        loadCodebookByHash();
        return;
    }
    window.location.hash = hash;
}

function loadCodebookByHash() {
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
        case 'enote':
            tabela('/enotaPodatki', 'Enote');
            break;
        case 'proizvajalci':
            tabela('/proizvajalecPodatki', 'Proizvajalci');
            break;
        case 'lokacije':
            tabela('/lokacijaPodatki', 'Lokacije');
            break;
        case 'os':
            tabela('/osPodatki', 'Operacijski sistemi');
            break;
        case 'tipiNaprav':
            tabela('/tipiNapravPodatki', 'Tipi naprav');
            break;
        case 'tipiTiskalnikov':
            tabela('/tipiTiskalnikovPodatki', 'Tipi tiskalnikov');
            break;
        case 'kategorijeTipovNaprav':
            tabela('/tipiKategorijeNapravPodatki', 'Kategorije tipov naprav');
            break;
        case 'dovoljenja':
            tabela('/dovoljenjaPodatki', 'Dovoljenja');
            break;
        case 'vloge':
            tabela('/vlogePodatki', 'Vloge');
            break;
        case 'sluzbe':
        default:
            tabela('/sluzbaPodatki', 'Službe');
            break;
    }
}

window.addEventListener('hashchange', loadCodebookByHash);
