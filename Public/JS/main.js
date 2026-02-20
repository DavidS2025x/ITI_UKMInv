let globalUserData = null;

async function uporabnikPodatki() {
    const response = await fetch('/uporabnikPodatki', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });

    if (!response.ok) {
        window.location.href = '/login';
        return;
    };
    
    const userData = await response.json();
    globalUserData = userData;
    return userData;
};

async function addNavigationLinks(userData) {
    const navLinksContainer = document.getElementById('navLinksContainer');
    navLinksContainer.innerHTML = ' ';

    const links = [
        { label: 'Nadzorna plošča', href: '/nadzornaPlosca', permission: 'D_OgledNadzornePlosce'},
        { label: 'Oprema', href: '/opremaPregled', permission: 'D_PregledOpreme'},
        { label: 'Oprema po osebi', href: '/opremaOsebePregled', permission: 'D_PregledOpreme'},
        { label: 'Osebe', href: '/osebaPregled', permission: 'D_UrejanjeUporabnikov'},
        { label: 'Šifranti', href: '/sifrantiPregled', permission: 'D_UrejanjeUporabnikov'},
        { label: 'Revizijska sled', href:'/auditPregled', permission: 'D_UrejanjeUporabnikov'}
    ];

    links.forEach(link => {
        if (userData[link.permission] === 1) {
            const li = document.createElement('li');
            li.className = 'nav-item';
            const a = document.createElement('a');
            a.className = 'nav-link px-3';
            a.href = link.href;
            a.textContent = link.label;
            li.appendChild(a);
            navLinksContainer.appendChild(li);
        };
    });
};

async function logout() {
    const response = await fetch('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });
    if (response.redirected) {
        window.location.href = response.url;
    }else{
        console.log(response);
        console.error('Logout failed');
    }
};

const booleanColumns = new Set([
    'Kamera',
    'Stojalo',
    'Dinamičen spomin',
    'Nadzorna plošča',
    'Pregled opreme',
    'Dodajanje opreme',
    'Urejanje opreme',
    'Brisanje opreme',
    'Urejanje uporabnikov'
]);

const gbColumns = new Set([
    'RAM',
    'Disk C',
    'Disk D',
    'RAM startup GB',
    'RAM min GB',
    'RAM max GB',
    'Disk C VHD file GB',
    'Disk C VHD max GB'
]);

const percentColumns = new Set([
    'Memory buffer %',
    'Zasedenost diska %'
]);

const centeredColumns = new Set([
    'Kamera',
    'Stojalo',
    'Proizvajalec',
    'Tip naprave',
    'Inventarna številka',
    'Enota',
    'Služba',
    'RAM',
    'Disk C',
    'Disk D',
    'Datum nakupa',
    'Datum proizvodnje',
    'Datum vnosa',
    'Datum posodobitve',
    'Delovna Postaja',
    'Velikost',
    'IP',
    'Serijska številka',
    'Cluster',
    'Okolje',
    'Dinamičen spomin',
    'RAM startup GB',
    'RAM min GB',
    'RAM max GB',
    'Memory buffer %',
    'Disk C VHD file GB',
    'Disk C VHD max GB',
    'Zasedenost diska %',
    'Ustvarjeno',
    'Posodobljeno',
    'Mobilni telefon',
    'Nadzorna plošča',
    'Pregled opreme',
    'Dodajanje opreme',
    'Urejanje opreme',
    'Brisanje opreme',
    'Urejanje uporabnikov'
])

function formatCellValue(value, columnName) {
    if (booleanColumns.has(columnName)) {
        if (value === 1 || value === '1' || value === true) return 'Da';
        if (value === 0 || value === '0' || value === false) return 'Ne';
    }

    if (value === null || value === undefined || value === '') return '';

    const textValue = String(value);
    if (gbColumns.has(columnName) && !textValue.endsWith(' GB')) {
        return `${textValue} GB`;
    }

    if (percentColumns.has(columnName) && !textValue.endsWith('%')) {
        return `${textValue} %`;
    }

    if(centeredColumns.has(columnName)){
        
    }

    return textValue;
}

function applyCellFormatting(td, value, columnName) {
    td.textContent = formatCellValue(value, columnName);
    if (centeredColumns.has(columnName)) {
        td.classList.add('text-center');
    } else {
        td.classList.remove('text-center');
    }
}

function movePaginationControls() {
    const table = document.getElementById('datatbl');
    const target = document.getElementById('paginationContainer');
    if (!table || !target) return;
    target.innerHTML = '';
    const wrapper = table.closest('.dataTables_wrapper');
    if (!wrapper) return;
    const info = wrapper.querySelector('.dataTables_info');
    const paginate = wrapper.querySelector('.dataTables_paginate');
    if (info) {
        target.appendChild(info);
    }
    if (paginate) {
        target.appendChild(paginate);
    }
}

function resetTableScroll() {
    const container = document.getElementById('table-responsive');
    if (container) {
        container.scrollLeft = 0;
        container.scrollTop = 0;
    }
}

function syncPagLimitRadios(pagLimit) {
    const radios = document.querySelectorAll('input[name="pagLimit"]');
    if (!radios.length) return;
    radios.forEach(radio => {
        radio.checked = Number(radio.value) === Number(pagLimit);
    });
}

function renderTable(dataUrl, config = {}) {
    const {
        editPath = null,
        deleteUrl = null,
        pageLimit = null,
        editPermission = 'D_UrejanjeOpreme',
        deletePermission = 'D_BrisanjeOpreme',
        title = null
    } = config;

    // Determine if user has permissions for any actions
    const canEdit = editPath !== null && globalUserData && globalUserData[editPermission] === 1;
    const canDelete = deleteUrl !== null && globalUserData && globalUserData[deletePermission] === 1;
    const withActions = canEdit || canDelete;

    const savedLimit = localStorage.getItem('pagLimit');
    const limit = pageLimit !== undefined && pageLimit !== null ? Number(pageLimit) : (savedLimit ? Number(savedLimit) : 25);
    window.currentPagLimit = limit;
    syncPagLimitRadios(limit);

    fetch(dataUrl)
        .then(r => r.json())
        .then(data => {
            if (!data.length) return;

            if ($.fn.dataTable.isDataTable('#datatbl')) {
                $('#datatbl').DataTable().destroy();
            }

            const datacolumns = Object.keys(data[0]);
            const idColumn = datacolumns[0];

            const thead = document.querySelector('#datatbl thead tr');
            thead.innerHTML = '';

            datacolumns.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col;
                thead.appendChild(th);
            });

            if (withActions) {
                const akciiHeader = document.createElement('th');
                akciiHeader.className = 'akcije-col';
                akciiHeader.textContent = 'Akcije';
                akciiHeader.style.width = '120px';
                thead.appendChild(akciiHeader);
            }

            const tbody = document.querySelector('#datatbl tbody');
            tbody.innerHTML = '';

            const fragment = document.createDocumentFragment();
            data.forEach(row => {
                const tr = document.createElement('tr');
                const rowId = row[idColumn];

                datacolumns.forEach(col => {
                    const td = document.createElement('td');
                    applyCellFormatting(td, row[col], col);
                    tr.appendChild(td);
                });

                if (withActions) {
                    const actionCell = document.createElement('td');
                    actionCell.className = 'akcije-col d-flex justify-content-center align-items-center gap-1';

                    if (canEdit) {
                        const editBtn = document.createElement('button');
                        editBtn.className = 'edit-btn';
                        editBtn.title = 'Uredi';
                        editBtn.innerHTML = '<i class="bi bi-pencil-square" style="font-size: 1rem; color: #6c757d;"></i>';
                        editBtn.style.background = 'none';
                        editBtn.style.border = 'none';
                        editBtn.style.padding = '0.25rem';
                        editBtn.style.cursor = 'pointer';
                        editBtn.style.display = 'flex';
                        editBtn.style.alignItems = 'center';
                        editBtn.style.transition = 'color 0.2s';
                        editBtn.onmouseover = () => editBtn.querySelector('i').style.color = '#495057';
                        editBtn.onmouseout = () => editBtn.querySelector('i').style.color = '#6c757d';
                        editBtn.onclick = async () => {
                            console.log('Edit ID:', rowId);
                            await fetch('/nastaviEditID', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({EditID: rowId})
                            });
                            window.location.href = editPath;
                        };
                        actionCell.appendChild(editBtn);
                    }

                    if (canDelete) {
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'delete-btn';
                        deleteBtn.title = 'Briši';
                        deleteBtn.innerHTML = '<i class="bi bi-trash-fill" style="font-size: 1rem; color: #dc3545;"></i>';
                        deleteBtn.style.background = 'none';
                        deleteBtn.style.border = 'none';
                        deleteBtn.style.padding = '0.25rem';
                        deleteBtn.style.cursor = 'pointer';
                        deleteBtn.style.display = 'flex';
                        deleteBtn.style.alignItems = 'center';
                        deleteBtn.style.transition = 'color 0.2s';
                        deleteBtn.onmouseover = () => deleteBtn.querySelector('i').style.color = '#c82333';
                        deleteBtn.onmouseout = () => deleteBtn.querySelector('i').style.color = '#dc3545';
                        deleteBtn.onclick = () => {
                            document.getElementById('modalID').textContent = rowId;
                            document.querySelector('.confirmModalBody').textContent = `Ste prepričani, da želite izbrisati vnos z ID: ${rowId}?`;
                            bootstrap.Modal.getOrCreateInstance('#confirmModal').show();
                        };
                        actionCell.appendChild(deleteBtn);
                    }

                    tr.appendChild(actionCell);
                }

                fragment.appendChild(tr);
            });
            tbody.appendChild(fragment);

            window.currentDataTable = $('#datatbl').DataTable({
                pageLength: limit,
                paging: true,
                searching: true,
                ordering: true,
                info: true,
                autoWidth: true,
                lengthChange: false,
                deferRender: true,
                language: {
                    search: 'Išči:',
                    paginate: {
                        first: 'Prva',
                        last: 'Zadnja',
                        next: 'Naslednja',
                        previous: 'Prejšnja'
                    },
                    info: 'Prikazujem od _START_ do _END_ od skupno _TOTAL_ vnosov',
                    infoFiltered: ' (filtrirano iz _MAX_ vnosov)',
                    infoEmpty: 'Ni rezultatov',
                    zeroRecords: 'Ni najdenih zapisov',
                    emptyTable: 'Ni podatkov v tabeli'
                }
            });

            window.currentDataTable.search('').draw();
            movePaginationControls();
            resetTableScroll();
            setUpSearch();
            setUpAddButton();

            // Set title after table is fully rendered
            if (title) {
                document.getElementById('naslovTabele').innerText = title;
            }

            document.querySelectorAll('input[name="pagLimit"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    window.currentDataTable.page.len(parseInt(e.target.value)).draw();
                    localStorage.setItem('pagLimit', e.target.value);
                    window.currentPagLimit = parseInt(e.target.value);
                });
            });
        });
}

function tabela(url, pagLimit, sortOrder = 'asc') {
    console.log(`Fetching data from: ${url}`);
    const savedLimit = localStorage.getItem('pagLimit');
    pagLimit = pagLimit !== undefined && pagLimit !== null ? Number(pagLimit) : (savedLimit ? Number(savedLimit) : 25);
    window.currentPagLimit = pagLimit;
    syncPagLimitRadios(pagLimit);
    
    fetch(url)
        .then(r => r.json())
        .then(data => {
            if (!data.length) return;
            
            // Destroy previous DataTable instance if exists
            if ($.fn.dataTable.isDataTable('#datatbl')) {
                $('#datatbl').DataTable().destroy();
            }
            
            const datacolumns = Object.keys(data[0]);
            console.log('Columns:', datacolumns);
            
            // Rebuild table header
            const thead = document.querySelector('#datatbl thead tr');
            thead.innerHTML = '';
            
            datacolumns.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col;
                thead.appendChild(th);
            });
            thead.querySelectorAll('th').forEach(th => {
                th.style.whiteSpace = 'nowrap';
            });
            
            // Clear tbody
            const tbody = document.querySelector('#datatbl tbody');
            tbody.innerHTML = '';

            // Add rows to tbody using a fragment to reduce reflows
            const fragment = document.createDocumentFragment();
            data.forEach(row => {
                const tr = document.createElement('tr');

                datacolumns.forEach(col => {
                    const td = document.createElement('td');
                    applyCellFormatting(td, row[col], col);
                    tr.appendChild(td);
                });

                fragment.appendChild(tr);
            });
            tbody.appendChild(fragment);

// Initialize DataTable
            window.currentDataTable = $('#datatbl').DataTable({
                pageLength: pagLimit,
                paging: true,
                searching: true,
                ordering: true,
                order: [[0, sortOrder]], // Sort by first column with specified order
                info: true,
                autoWidth: true,
                lengthChange: false,
                deferRender: true,
                language: {
                    search: 'Išči:',
                    paginate: {
                        first: 'Prva',
                        last: 'Zadnja',
                        next: 'Naslednja',
                        previous: 'Prejšnja'
                    },
                    info: 'Prikazujem od _START_ do _END_ od skupno _TOTAL_ vnosov',
                    infoFiltered: ' (filtrirano iz _MAX_ vnosov)',
                    infoEmpty: 'Ni rezultatov',
                    zeroRecords: 'Ni najdenih zapisov',
                    emptyTable: 'Ni podatkov v tabeli'
                }
            });
            
            // Rebuild search index
            window.currentDataTable.search('').draw();

            movePaginationControls();
            resetTableScroll();
            
            // Call setup functions after DataTable is ready
            setUpSearch();
            
            // Update pagination buttons when page length changes
            document.querySelectorAll('input[name="pagLimit"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    window.currentDataTable.page.len(parseInt(e.target.value)).draw();
                    localStorage.setItem('pagLimit', e.target.value);
                    window.currentPagLimit = parseInt(e.target.value);
                });
            });
        });
}

function tabelaOsebe(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediOsebo',
        deleteUrl: '/izbrisOseba',
        editPermission: 'D_UrejanjeUporabnikov',
        deletePermission: 'D_UrejanjeUporabnikov',
        title: title
    });
}

function tabelaUporabniki(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediUporabnika',
        deleteUrl: '/izbrisUporabnik',
        editPermission: 'D_UrejanjeUporabnikov',
        deletePermission: 'D_UrejanjeUporabnikov',
        title: title
    });
}

function tabelaDelovnePostaje(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediDelovnaPostaja',
        deleteUrl: '/izbrisDelovnaPostaja',
        title: title
    });
}

function tabelaMonitorji(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediMonitor',
        deleteUrl: '/izbrisMonitor',
        title: title
    });
}

function tabelaTiskalniki(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediTiskalnik',
        deleteUrl: '/izbrisTiskalnik',
        title: title
    });
}

function tabelaCitalci(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediRocniCitalec',
        deleteUrl: '/izbrisRocniCitalec',
        title: title
    });
}

window.uporabnikPodatki = uporabnikPodatki;
window.logout = logout;
window.addNavigationLinks = addNavigationLinks;
window.tabela = tabela;
window.renderTable = renderTable;
window.tabelaOsebe = tabelaOsebe;
window.tabelaUporabniki = tabelaUporabniki;
window.tabelaDelovnePostaje = tabelaDelovnePostaje;
window.tabelaMonitorji = tabelaMonitorji;
window.tabelaTiskalniki = tabelaTiskalniki;
window.tabelaCitalci = tabelaCitalci;