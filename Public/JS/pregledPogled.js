/// <reference path="./main.js" />

window.disableAddButton = true;

function displayViewResults(data, viewName) {
    if (!data || data.length === 0) {
        alert('Ni podatkov v pogledu');
        return;
    }

    const modal = document.getElementById('viewResultsModal');
    const modalTitle = document.getElementById('viewResultsModalLabel');
    modalTitle.textContent = `Rezultati pogleda: ${viewName}`;

    const table = document.getElementById('viewResultsTable');
    const thead = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');

    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Create headers
    const columns = Object.keys(data[0]);
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        thead.appendChild(th);
    });

    // Create rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col] !== null ? row[col] : '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    // Show modal
    bootstrap.Modal.getOrCreateInstance(modal).show();
}

window.displayViewResults = displayViewResults;

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
        tabelaPogled('/pogledPodatki', 'Pogled');
    });
