// Globalna spremenljivka za shranjevanje podatkov o prijavljenem uporabniku.
// Nastavljena ob klicu uporabnikPodatki() in dostopna po vsem skriptu.
let globalUserData = null;

/**
 * Pridobi podatke o trenutno prijavljenem uporabniku iz seje strežnika.
 * Ob uspešnem odgovoru shrani podatke v globalUserData.
 * V primeru napake (401 / neaktivna seja) preusmeri na stran za prijavo.
 *
 * @async
 * @returns {Promise<Object>} Objekt s polji: Ime, Priimek, UporabniskoIme, OznakaVloge in zastavicami dovoljenj.
 */
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

/**
 * Dinamično zgradi navigacijske povezave v navigacijski vrstici glede na dovoljenja uporabnika.
 * Vsaka povezava je prikazana samo, če ima uporabnik ustrezno dovoljenje (vrednost 1).
 *
 * @async
 * @param {Object} userData - Objekt s podatki o uporabniku, pridobljen iz uporabnikPodatki().
 * @returns {Promise<void>}
 */
async function addNavigationLinks(userData) {
    const navLinksContainer = document.getElementById('navLinksContainer');
    navLinksContainer.innerHTML = ' ';

    const links = [
        { label: 'Nadzorna plošča', href: '/nadzornaPlosca', permission: 'D_OgledNadzornePlosce'},
        { label: 'Oprema', href: '/opremaPregled', permission: 'D_PregledOpreme'},
        { label: 'Oprema po osebi', href: '/opremaOsebePregled', permission: 'D_PregledOpreme'},
        { label: 'Osebe', href: '/osebaPregled', permission: 'D_UrejanjeUporabnikov'},
        { label: 'Šifranti', href: '/sifrantiPregled', permission: 'D_UrejanjeUporabnikov'},
        { label: 'Revizijska sled', href:'/auditPregled', permission: 'D_UrejanjeUporabnikov'},
        { label: 'Pogled', href:'/pogledPregled', permission: 'D_UrejanjeUporabnikov'}
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

/**
 * Odjavi trenutno prijavljenega uporabnika.
 * Pošlje POST zahtevo na /logout. Ob preusmeritvi strežnika (po uspešni odjavi)
 * preusmeri brskalnik na stran za prijavo.
 *
 * @async
 * @returns {Promise<void>}
 */
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

// Nabor stolpcev, katerih vrednosti se prikažejo kot Da/Ne namesto 1/0.
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

// Nabor stolpcev, katerih vrednostim se doda enota GB (za količine pomnilnika in diskov).
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

// Nabor stolpcev, katerih vrednostim se doda znak % (za deleže in zasedbo).
const percentColumns = new Set([
    'Memory buffer %',
    'Zasedenost diska %'
]);

// Nabor stolpcev, ki se v tabeli prikažejo centrirano.
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

/**
 * Formatira vrednost celice glede na ime stolpca.
 * - Vrednosti v booleanColumns se pretvorijo v 'Da' ali 'Ne'.
 * - Vrednostim v gbColumns se doda pripona ' GB'.
 * - Vrednostim v percentColumns se doda pripona ' %'.
 * - Prazne, null ali undefined vrednosti se prikažejo kot prazen niz.
 *
 * @param {*} value - Vrednost celice.
 * @param {string} columnName - Ime stolpca (ključ iz vrnjenega objekta JSON).
 * @returns {string} Formatiran prikaz vrednosti.
 */
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

/**
 * Nastavi vsebino in poravnavo elementa <td> glede na vrednost in ime stolpca.
 * Kliče formatCellValue() za pridobitev prikaza vrednosti ter doda CSS razred
 * 'text-center', če stolpec spada v centeredColumns.
 *
 * @param {HTMLTableCellElement} td - Element <td>, ki ga je treba napolniti.
 * @param {*} value - Vrednost celice.
 * @param {string} columnName - Ime stolpca.
 * @returns {void}
 */
function applyCellFormatting(td, value, columnName) {
    td.textContent = formatCellValue(value, columnName);
    if (centeredColumns.has(columnName)) {
        td.classList.add('text-center');
    } else {
        td.classList.remove('text-center');
    }
}

/**
 * Premakne kontrolnike za paginacijo (informacija o strani in gumbi za
 * navigacijo) iz ovoja DataTables v namenski element #paginationContainer.
 * Zagotavlja, da kontrolniki ostanejo na pravilnem mestu po ponovni gradnji tabele.
 *
 * @returns {void}
 */
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

/**
 * Ponastavi položaj vodoravnega in navpičnega drsnika v kontejnerju tabele
 * (#table-responsive) na začetek. Kliče se po ponovni gradnji tabele.
 *
 * @returns {void}
 */
function resetTableScroll() {
    const container = document.getElementById('table-responsive');
    if (container) {
        container.scrollLeft = 0;
        container.scrollTop = 0;
    }
}

/**
 * Sinhronizira stanje radijskih gumbov za izbiro števila prikazanih vnosov
 * (#pagLimitContainer) z vrednostjo pagLimit.
 *
 * @param {number} pagLimit - Želena vrednost za število prikazanih vnosov na stran.
 * @returns {void}
 */
function syncPagLimitRadios(pagLimit) {
    const radios = document.querySelectorAll('input[name="pagLimit"]');
    if (!radios.length) return;
    radios.forEach(radio => {
        radio.checked = Number(radio.value) === Number(pagLimit);
    });
}

/**
 * Vzpostavi iskalnik za tabelo DataTables (#tableSearch).
 * Klonira obstoječi vnos, da odstrani prej privezane poslušalce,
 * nato priveze nov 'keyup' poslušalec, ki sproži iskanje po DataTables.
 * Kliče se po vsaki gradnji tabele.
 *
 * @returns {void}
 */
function setUpSearch() {
    const searchInput = document.getElementById('tableSearch');
    if (!searchInput || !window.currentDataTable) return;

    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

    newSearchInput.addEventListener('keyup', (e) => {
        const searchValue = e.target.value;
        if (window.currentDataTable) {
            try {
                window.currentDataTable.search(searchValue, false, true, true).draw();
            } catch (err) {
                console.error('Error applying search:', err);
            }
        }
    });
}

/**
 * Pripravi gumb za dodajanje novega vnosa (#addBtn) glede na dovoljenja.
 * - Če je window.disableAddButton resničen, gumb skrije.
 * - Če ima uporabnik ustrezno dovoljenje, gumb prikaže in mu nastavi klik na
 *   window.currentButtonAction (ali lokalno spremenljivko currentButtonAction).
 * - V nasprotnem primeru gumb skrije.
 *
 * @param {string} [permissionFlag] - Ključ dovoljenja (npr. 'D_DodajanjeOpreme').
 *   Če ni podan, se uporabi window.addButtonPermission.
 * @returns {void}
 */
function setUpAddButton(permissionFlag) {
    const addBtn = document.getElementById('addBtn');
    if (!addBtn) return;

    if (window.disableAddButton) {
        addBtn.style.display = 'none';
        return;
    }

    const resolvedPermission = permissionFlag || window.addButtonPermission;
    if (!resolvedPermission) {
        addBtn.style.display = 'none';
        return;
    }

    if (globalUserData && globalUserData[resolvedPermission] === 1) {
        addBtn.style.display = 'inline-flex';
        const action = (typeof currentButtonAction !== 'undefined' && currentButtonAction)
            ? currentButtonAction
            : window.currentButtonAction;
        addBtn.onclick = () => {
            if (action) {
                window.location.href = action;
            }
        };
    } else {
        addBtn.style.display = 'none';
    }
}

/**
 * Trajno skrije gumb za dodajanje (#addBtn) na trenutni strani.
 * Nastavi window.disableAddButton na true, da prepreči, da bi kasnejši
 * klici setUpAddButton() gumb znova prikazali.
 *
 * @returns {void}
 */
function removeAddButton() {
    window.disableAddButton = true;
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.style.display = 'none';
    }
}

/**
 * Splošna funkcija za prikazovanje tabele s podatki in izbirnimi akcijami (uredi/briši).
 * Pridobi podatke z določenega URL-ja, dinamično zgradi glavo in vrstice tabele,
 * ter doda stolpec z gumbi za akcije, če ima uporabnik ustrezna dovoljenja.
 * Na koncu inicializira DataTables in nastavi iskanje ter paginacijo.
 *
 * @param {string} dataUrl - URL za pridobitev JSON podatkov (GET zahteva).
 * @param {Object} [config] - Konfiguracijski objekt:
 * @param {string|null} [config.editPath] - Pot za preusmerjanje pri urejanju (npr. '/urediOsebo').
 * @param {string|null} [config.deleteUrl] - URL za brisanje vnosa (POST zahteva).
 * @param {number|null} [config.pageLimit] - Število vnosov na stran.
 * @param {string} [config.editPermission='D_UrejanjeOpreme'] - Ključ dovoljenja za urejanje.
 * @param {string} [config.deletePermission='D_BrisanjeOpreme'] - Ključ dovoljenja za brisanje.
 * @param {string|null} [config.title] - Naslov tabele, ki se prikaže nad njo.
 * @returns {void}
 */
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
                setTableTitle(title);
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

/**
 * Prikazuje enostavno tabelo samo za branje brez gumbov za akcije.
 * Namenjena prikazovanju podatkov, kjer urejanje in brisanje nista potrebna
 * (npr. revizijska sled, pogledi).
 * Inicializira DataTables in nastavi iskanje ter paginacijo.
 *
 * @param {string} url - URL za pridobitev JSON podatkov (GET zahteva).
 * @param {number|null} [pagLimit] - Število vnosov na stran; če ni podano, se bere iz localStorage.
 * @param {string} [sortOrder='asc'] - Smer razvrstitvenega vrstnega reda prvega stolpca ('asc' ali 'desc').
 * @returns {void}
 */
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

/**
 * Prikaže tabelo oseb s stolpcema za urejanje in brisanje.
 * Obe akciji zahtevata dovoljenje D_UrejanjeUporabnikov.
 *
 * @param {string} url - URL za pridobitev JSON podatkov oseb.
 * @param {string} title - Naslov tabele.
 * @param {number} [pagLimit] - Število vnosov na stran.
 * @returns {void}
 */
function tabelaOsebe(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediOsebo',
        deleteUrl: '/izbrisOseba',
        editPermission: 'D_UrejanjeUporabnikov',
        deletePermission: 'D_UrejanjeUporabnikov',
        title: title
    });
}

/**
 * Prikaže tabelo sistemskih uporabnikov s stolpcema za urejanje in brisanje.
 * Obe akciji zahtevata dovoljenje D_UrejanjeUporabnikov.
 *
 * @param {string} url - URL za pridobitev JSON podatkov uporabnikov.
 * @param {string} title - Naslov tabele.
 * @param {number} [pagLimit] - Število vnosov na stran.
 * @returns {void}
 */
function tabelaUporabniki(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediUporabnika',
        deleteUrl: '/izbrisUporabnik',
        editPermission: 'D_UrejanjeUporabnikov',
        deletePermission: 'D_UrejanjeUporabnikov',
        title: title
    });
}

/**
 * Prikaže tabelo delovnih postaj s stolpcema za urejanje in brisanje.
 * Akciji zahtevata privzeti dovoljenji D_UrejanjeOpreme / D_BrisanjeOpreme.
 *
 * @param {string} url - URL za pridobitev JSON podatkov delovnih postaj.
 * @param {string} title - Naslov tabele.
 * @param {number} [pagLimit] - Število vnosov na stran.
 * @returns {void}
 */
function tabelaDelovnePostaje(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediDelovnaPostaja',
        deleteUrl: '/izbrisDelovnaPostaja',
        title: title
    });
}

/**
 * Prikaže tabelo monitorjev s stolpcema za urejanje in brisanje.
 * Akciji zahtevata privzeti dovoljenji D_UrejanjeOpreme / D_BrisanjeOpreme.
 *
 * @param {string} url - URL za pridobitev JSON podatkov monitorjev.
 * @param {string} title - Naslov tabele.
 * @param {number} [pagLimit] - Število vnosov na stran.
 * @returns {void}
 */
function tabelaMonitorji(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediMonitor',
        deleteUrl: '/izbrisMonitor',
        title: title
    });
}

/**
 * Prikaže tabelo tiskalnikov s stolpcema za urejanje in brisanje.
 * Akciji zahtevata privzeti dovoljenji D_UrejanjeOpreme / D_BrisanjeOpreme.
 *
 * @param {string} url - URL za pridobitev JSON podatkov tiskalnikov.
 * @param {string} title - Naslov tabele.
 * @param {number} [pagLimit] - Število vnosov na stran.
 * @returns {void}
 */
function tabelaTiskalniki(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediTiskalnik',
        deleteUrl: '/izbrisTiskalnik',
        title: title
    });
}

/**
 * Prikaže tabelo ročnih čitalcev s stolpcema za urejanje in brisanje.
 * Akciji zahtevata privzeti dovoljenji D_UrejanjeOpreme / D_BrisanjeOpreme.
 *
 * @param {string} url - URL za pridobitev JSON podatkov ročnih čitalcev.
 * @param {string} title - Naslov tabele.
 * @param {number} [pagLimit] - Število vnosov na stran.
 * @returns {void}
 */
function tabelaCitalci(url, title, pagLimit) {
    renderTable(url, {
        editPath: '/urediRocniCitalec',
        deleteUrl: '/izbrisRocniCitalec',
        title: title
    });
}

/**
 * Prikaže tabelo razpoložljivih pogledov (tabela 'pogled') z gumbom za izvedbo
 * poizvedbe. Za vsako vrstico doda gumb z ikono očesa, ki sproži klic executeViewQuery()
 * z vrednostjo stolpca 'Naziv pogleda' iz tiste vrstice.
 * Na koncu inicializira DataTables in nastavi iskanje ter paginacijo.
 *
 * @param {string} url - URL za pridobitev JSON podatkov pogledov (GET zahteva).
 * @param {string} title - Naslov tabele.
 * @param {number} [pagLimit] - Število vnosov na stran; če ni podano, se bere iz localStorage.
 * @returns {void}
 */
function tabelaPogled(url, title, pagLimit) {
    const savedLimit = localStorage.getItem('pagLimit');
    const limit = pagLimit !== undefined && pagLimit !== null ? Number(pagLimit) : (savedLimit ? Number(savedLimit) : 25);
    window.currentPagLimit = limit;
    syncPagLimitRadios(limit);

    fetch(url)
        .then(r => r.json())
        .then(data => {
            if (!data.length) return;

            if ($.fn.dataTable.isDataTable('#datatbl')) {
                $('#datatbl').DataTable().destroy();
            }

            const datacolumns = Object.keys(data[0]);
            const thead = document.querySelector('#datatbl thead tr');
            thead.innerHTML = '';

            datacolumns.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col;
                thead.appendChild(th);
            });

            // Add Actions column
            const akciiHeader = document.createElement('th');
            akciiHeader.className = 'akcije-col';
            akciiHeader.textContent = 'Akcije';
            akciiHeader.style.width = '120px';
            thead.appendChild(akciiHeader);

            const tbody = document.querySelector('#datatbl tbody');
            tbody.innerHTML = '';

            const fragment = document.createDocumentFragment();
            data.forEach(row => {
                const tr = document.createElement('tr');
                const viewName = row['Naziv pogleda'];

                datacolumns.forEach(col => {
                    const td = document.createElement('td');
                    applyCellFormatting(td, row[col], col);
                    tr.appendChild(td);
                });

                // Add View button
                const actionCell = document.createElement('td');
                actionCell.className = 'akcije-col d-flex justify-content-center align-items-center gap-1';

                const viewBtn = document.createElement('button');
                viewBtn.className = 'view-btn';
                viewBtn.title = 'Prikaži pogled';
                viewBtn.innerHTML = '<i class="bi bi-eye-fill" style="font-size: 1rem; color: #0d6efd;"></i>';
                viewBtn.style.background = 'none';
                viewBtn.style.border = 'none';
                viewBtn.style.padding = '0.25rem';
                viewBtn.style.cursor = 'pointer';
                viewBtn.style.display = 'flex';
                viewBtn.style.alignItems = 'center';
                viewBtn.style.transition = 'color 0.2s';
                viewBtn.onmouseover = () => viewBtn.querySelector('i').style.color = '#0b5ed7';
                viewBtn.onmouseout = () => viewBtn.querySelector('i').style.color = '#0d6efd';
                viewBtn.onclick = () => executeViewQuery(viewName);
                actionCell.appendChild(viewBtn);

                tr.appendChild(actionCell);
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

            if (title) {
                setTableTitle(title);
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

/**
 * Pošlje POST zahtevo na /izvrsiPogled z imenom pogleda in prikaže rezultate
 * v modalnem oknu prek displayViewResults().
 * Ob napaki prikaže opozorilo.
 *
 * @param {string} viewName - Ime podatkovnega pogleda (vrednost stolpca NazivPogleda).
 * @returns {void}
 */
function executeViewQuery(viewName) {
    console.log(`Executing view query: ${viewName}`);
    fetch('/izvrsiPogled', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({viewName: viewName})
    })
    .then(r => r.json())
    .then(data => {
        displayViewResults(data, viewName);
    })
    .catch(err => {
        console.error('Error executing view:', err);
        alert('Napaka pri izvajanju pogleda');
    });
}

// Slovar naslovov tabel in ustreznih Bootstrap Icons razredov.
// Ključ je naslov tabele (enak kot parameter 'title'), vrednost pa CSS razred ikone.
const TABLE_TITLE_ICONS = {
    'Osebe': 'bi-people',
    'Uporabniki': 'bi-person-badge',
    'Delovne postaje': 'bi-pc-display',
    'Monitorji': 'bi-display',
    'Tiskalniki': 'bi-printer',
    'Ročni čitalci': 'bi-upc-scan',
    'Virtualni strežniki': 'bi-hdd-network',
    'Službe': 'bi-diagram-3',
    'Enote': 'bi-grid',
    'Proizvajalci': 'bi-building',
    'Lokacije': 'bi-geo-alt',
    'Operacijski sistemi': 'bi-cpu',
    'Tipi naprav': 'bi-tags',
    'Tipi tiskalnikov': 'bi-printer',
    'Vloge': 'bi-shield-lock',
    'Revizijska sled': 'bi-clipboard-data',
    'Pogled': 'bi-eye'
};

/**
 * Nastavi naslov in ikono nad tabelo (#naslovTabele).
 * - Element #naslovTabeleText dobi novo besedilo.
 * - Element #naslovTabeleIcon dobi Bootstrap Icons razred glede na TABLE_TITLE_ICONS
 *   ali neposredno podani iconClass.
 * Če elementi ne obstajajo ali naslov ni podan, funkcija ne naredi nič.
 *
 * @param {string} title - Besedilo naslova tabele.
 * @param {string} [iconClass] - Neobvezni CSS razred ikone (npr. 'bi-pc-display').
 *   Če ni podan, se ikona poišče v TABLE_TITLE_ICONS[title].
 * @returns {void}
 */
function setTableTitle(title, iconClass) {
    const titleEl = document.getElementById('naslovTabele');
    if (!titleEl || !title) {
        return;
    }

    const textEl = document.getElementById('naslovTabeleText');
    if (textEl) {
        textEl.textContent = title;
    } else {
        titleEl.textContent = title;
    }

    const iconEl = document.getElementById('naslovTabeleIcon');
    const resolvedIcon = iconClass || TABLE_TITLE_ICONS[title];
    if (iconEl && resolvedIcon) {
        iconEl.className = `bi ${resolvedIcon}`;
    }
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
window.tabelaPogled = tabelaPogled;
window.executeViewQuery = executeViewQuery;
window.setTableTitle = setTableTitle;
window.removeAddButton = removeAddButton;