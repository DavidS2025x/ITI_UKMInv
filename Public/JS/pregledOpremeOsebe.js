/// <reference path="./main.js" />

/**
 * Pregled opreme osebe – stran za prikaz vseh naprav, dodeljenih izbrani osebi.
 * Prikazuje delovne postaje, monitorje, tiskalnike in ročne čitalce v ločenih karticah.
 * Uporabniki z dovoljenjem UREJANJE_OPREME imajo na voljo gumbe za urejanje,
 * uporabniki z dovoljenjem ODSTRANITEV_UPORABNIKA_OPREME pa gumbe za odstranjevanje.
 */

/**
 * Naloži spustni seznam vseh oseb s strežnika in ga zapolni.
 * Nastavi poslušalec za spremembo izbire, ki sprobi naložitev opreme izbrane osebe.
 */
async function loadOsebeDropdown() {
    try {
        const response = await fetch('/osebaPodatkiForm');
        const osebe = await response.json();
        const select = document.getElementById('osebaSelect');
        const refreshButton = document.getElementById('refreshOsebaButton');
        
        osebe.forEach(oseba => {
            const option = document.createElement('option');
            option.value = oseba['UporabniskoIme'];
            option.textContent = oseba['Ime'];
            select.appendChild(option);
        });
        
        select.addEventListener('change', loadOsebaOprema);
        refreshButton.addEventListener('click', loadOsebaOprema);

        // Auto-select person and load their data when returning from an edit page
        const preselect = new URLSearchParams(window.location.search).get('username');
        if (preselect) {
            select.value = preselect;
            if (select.value === preselect) {
                await loadOsebaOprema();
            }
        }
    } catch (err) {
        console.error('Error loading osebe:', err);
    }
}

/** Shranjevanje podatkov prijavljenega uporabnika za preverjanje dovoljenj pri izrisu seznamov. */
let currentUserData = null;

const UNASSIGN_CONFIG = {
    delovnePostaje: { url: '/nerazporejenaDelovnaPostaja', label: 'delovne postaje' },
    monitorji: { url: '/nerazporejenMonitor', label: 'monitorja' },
    tiskalniki: { url: '/nerazporejenTiskalnik', label: 'tiskalnika' },
    rocniCitalci: { url: '/nerazporejenRocniCitalec', label: 'ročnega čitalca' }
};

function fallbackValue(value) {
    if (value === null || value === undefined || value === '') {
        return '-';
    }
    return value;
}

function renderUserSummary(user) {
    const placeholder = document.getElementById('userSummaryPlaceholder');
    const content = document.getElementById('userSummaryContent');

    if (!user) {
        updateEditSelectedUserButton(null);
        placeholder.classList.remove('d-none');
        content.classList.add('d-none');
        return;
    }

    document.getElementById('selectedUserFullName').textContent = `${fallbackValue(user.Ime)} ${fallbackValue(user.Priimek)}`.trim();
    document.getElementById('selectedUserUsername').textContent = user.UporabniskoIme ? user.UporabniskoIme : '';
    document.getElementById('selectedUserEmail').textContent = fallbackValue(user.ElektronskaPosta);
    document.getElementById('selectedUserMobile').textContent = fallbackValue(user.MobilniTelefon);
    document.getElementById('selectedUserInternal').textContent = fallbackValue(user.InterniTelefoni);
    document.getElementById('selectedUserEnota').textContent = fallbackValue(user.OznakaEnote);
    document.getElementById('selectedUserSluzba').textContent = fallbackValue(user.OznakaSluzbe);
    document.getElementById('selectedUserLokacija').textContent = fallbackValue(user.Lokacija);
    updateEditSelectedUserButton(user.UporabniskoIme || null);

    placeholder.classList.add('d-none');
    content.classList.remove('d-none');
}

function updateEditSelectedUserButton(username) {
    const editBtn = document.getElementById('editSelectedUserButton');
    if (!editBtn) return;

    const canEditUsers = currentUserData && currentUserData.dovoljenja?.includes('UREJANJE_UPORABNIKOV');
    const validUsername = username && username !== '-';
    const visible = Boolean(canEditUsers && validUsername);

    editBtn.classList.toggle('d-none', !visible);
    editBtn.disabled = !visible;
    editBtn.dataset.username = visible ? username : '';
}

async function openSelectedUserEdit() {
    const canEditUsers = currentUserData && currentUserData.dovoljenja?.includes('UREJANJE_UPORABNIKOV');
    if (!canEditUsers) return;

    const editBtn = document.getElementById('editSelectedUserButton');
    const selectedUsername = (editBtn?.dataset?.username || document.getElementById('osebaSelect')?.value || '').trim();
    if (!selectedUsername) return;

    try {
        await fetch('/nastaviEditID', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                EditID: selectedUsername,
                returnUrl: '/opremaOsebePregled?username=' + encodeURIComponent(selectedUsername)
            })
        });
        window.location.href = '/urediOsebo';
    } catch (err) {
        console.error('Error setting selected person edit ID:', err);
    }
}

function resetUserSummary() {
    renderUserSummary(null);
    document.getElementById('chipDelovnePostaje').textContent = 'DP: 0';
    document.getElementById('chipMonitorji').textContent = 'MON: 0';
    document.getElementById('chipTiskalniki').textContent = 'TIS: 0';
    document.getElementById('chipRocniCitalci').textContent = 'RC: 0';
}

function updateSummaryCountChips(delovnePostaje, monitorji, tiskalniki, rocniCitalci) {
    document.getElementById('chipDelovnePostaje').textContent = `DP: ${delovnePostaje.length}`;
    document.getElementById('chipMonitorji').textContent = `MON: ${monitorji.length}`;
    document.getElementById('chipTiskalniki').textContent = `TIS: ${tiskalniki.length}`;
    document.getElementById('chipRocniCitalci').textContent = `RC: ${rocniCitalci.length}`;
}

/**
 * Naloži in prikaže vso opremo izbrane osebe iz spustnega seznama.
 * Ob spremembi izbire zbriše obstoječo vsebino in pridobi nove podatke s strežnika za vse tipe naprav.
 */
async function loadOsebaOprema() {
    const osebaSelect = document.getElementById('osebaSelect');
    const uporabniskoIme = osebaSelect.value;
    
    // Clear all containers
    document.getElementById('delovnePostajeContainer').innerHTML = '<p class="text-muted text-center">Nalaganje...</p>';
    document.getElementById('monitorjiContainer').innerHTML = '<p class="text-muted text-center">Nalaganje...</p>';
    document.getElementById('tiskalnikContainer').innerHTML = '<p class="text-muted text-center">Nalaganje...</p>';
    document.getElementById('rocniCitalecContainer').innerHTML = '<p class="text-muted text-center">Nalaganje...</p>';
    document.getElementById('userSummaryPlaceholder').textContent = 'Nalaganje podrobnosti osebe...';
    
    if (!uporabniskoIme) {
        document.getElementById('delovnePostajeContainer').innerHTML = '<p class="text-muted text-center">Izberite osebo za prikaz podatkov</p>';
        document.getElementById('monitorjiContainer').innerHTML = '<p class="text-muted text-center">Izberite osebo za prikaz podatkov</p>';
        document.getElementById('tiskalnikContainer').innerHTML = '<p class="text-muted text-center">Izberite osebo za prikaz podatkov</p>';
        document.getElementById('rocniCitalecContainer').innerHTML = '<p class="text-muted text-center">Izberite osebo za prikaz podatkov</p>';
        document.getElementById('countDelovnePostaje').textContent = '[0]';
        document.getElementById('countMonitorji').textContent = '[0]';
        document.getElementById('countTiskalniki').textContent = '[0]';
        document.getElementById('countRocniCitalci').textContent = '[0]';
        document.getElementById('userSummaryPlaceholder').textContent = 'Izberite osebo za prikaz podrobnosti';
        resetUserSummary();
        return;
    }
    
    try {
        const [osebaResponse, dpResponse, mResponse, tResponse, rcResponse] = await Promise.all([
            fetch(`/osebaPodatkiPovzetek?username=${encodeURIComponent(uporabniskoIme)}`),
            fetch(`/osebDelovnePostaje?username=${encodeURIComponent(uporabniskoIme)}`),
            fetch(`/osebMonitorji?username=${encodeURIComponent(uporabniskoIme)}`),
            fetch(`/osebTiskalniki?username=${encodeURIComponent(uporabniskoIme)}`),
            fetch(`/osebRocniCitalci?username=${encodeURIComponent(uporabniskoIme)}`)
        ]);

        const oseba = osebaResponse.ok ? await osebaResponse.json() : null;
        const delovnePostaje = dpResponse.ok ? await dpResponse.json() : [];
        const monitorji = mResponse.ok ? await mResponse.json() : [];
        const tiskalniki = tResponse.ok ? await tResponse.json() : [];
        const rocniCitalci = rcResponse.ok ? await rcResponse.json() : [];
        
        // Render data
        renderUserSummary(oseba);
        updateSummaryCountChips(delovnePostaje, monitorji, tiskalniki, rocniCitalci);
        renderEquipmentList(delovnePostaje, 'delovnePostajeContainer', 'countDelovnePostaje', 'delovnePostaje', currentUserData);
        renderEquipmentList(monitorji, 'monitorjiContainer', 'countMonitorji', 'monitorji', currentUserData);
        renderEquipmentList(tiskalniki, 'tiskalnikContainer', 'countTiskalniki', 'tiskalniki', currentUserData);
        renderEquipmentList(rocniCitalci, 'rocniCitalecContainer', 'countRocniCitalci', 'rocniCitalci', currentUserData);
    } catch (err) {
        console.error('Error loading equipment data:', err);
        document.getElementById('delovnePostajeContainer').innerHTML = '<p class="text-danger text-center">Napaka pri nalaganju podatkov</p>';
        document.getElementById('monitorjiContainer').innerHTML = '<p class="text-danger text-center">Napaka pri nalaganju podatkov</p>';
        document.getElementById('tiskalnikContainer').innerHTML = '<p class="text-danger text-center">Napaka pri nalaganju podatkov</p>';
        document.getElementById('rocniCitalecContainer').innerHTML = '<p class="text-danger text-center">Napaka pri nalaganju podatkov</p>';
        document.getElementById('countDelovnePostaje').textContent = '[0]';
        document.getElementById('countMonitorji').textContent = '[0]';
        document.getElementById('countTiskalniki').textContent = '[0]';
        document.getElementById('countRocniCitalci').textContent = '[0]';
        document.getElementById('userSummaryPlaceholder').textContent = 'Napaka pri nalaganju podrobnosti osebe';
        resetUserSummary();
    }
}

function renderEquipmentList(data, containerId, countSpanId, equipmentType, userData) {
    const container = document.getElementById(containerId);
    const countSpan = document.getElementById(countSpanId);
    const hasEditPermission = userData && userData.dovoljenja?.includes('UREJANJE_OPREME');
    const hasUnassignPermission = userData && userData.dovoljenja?.includes('ODSTRANITEV_UPORABNIKA_OPREME');
    
    // Update count in header
    if (countSpan) {
        countSpan.textContent = `[${data ? data.length : 0}]`;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Ni naprav</p>';
        return;
    }
    
    // Get all field names from first item, excluding EditID
    const allFields = Object.keys(data[0] || {}).filter(key => key !== 'EditID');
    
    const cardsHTML = data.map(item => {
        const editId = encodeURIComponent(item['EditID'] || '');
        
        // First field is the main identifier (like "Oznaka delovne postaje")
        const firstField = allFields[0];
        const firstValue = item[firstField] || '-';
        
        // Rest of the fields are details
        const detailsHTML = allFields
            .slice(1)
            .map(field => `<div class="small text-muted">${field}: ${item[field] ?? '-'}</div>`)
            .join('');
        
        const unassignBtn = (hasUnassignPermission) ? `
            <button class="unassign-btn" style="background: none; border: none; padding: 0.25rem 0.5rem; cursor: pointer; display: flex; align-items: center; transition: color 0.2s;" onclick="openUnassignModalOS('${firstValue}', '${equipmentType}')" title="Označi kot nerazporejeno" onmouseover="this.querySelector('i').style.color='#e8590c'" onmouseout="this.querySelector('i').style.color='#fd7e14'">
                <i class="bi bi-person-dash-fill" style="font-size: 1rem; color: #fd7e14;"></i>
            </button>` : '';
        
        const editBtn = hasEditPermission ? `
            <button class="edit-btn" style="background: none; border: none; padding: 0.25rem 0.5rem; cursor: pointer; display: flex; align-items: center; transition: color 0.2s;" onclick="openEquipmentEdit('${equipmentType}', '${editId}')" title="Uredi" onmouseover="this.querySelector('i').style.color='#495057'" onmouseout="this.querySelector('i').style.color='#6c757d'">
                <i class="bi bi-pencil-square" style="font-size: 1rem; color: #6c757d;"></i>
            </button>` : '';
        
        const buttonsHTML = (hasEditPermission || hasUnassignPermission) ? `
            <div style="display: flex; gap: 0.5rem;">
                ${editBtn}
                ${unassignBtn}
            </div>
        ` : '';
        
        return `
            <div class="d-flex justify-content-between align-items-start border rounded p-2 mb-2">
                <div>
                    <div><strong>${firstField}: ${firstValue}</strong></div>
                    ${detailsHTML}
                </div>
                ${buttonsHTML}
            </div>
        `;
    }).join('');
    
    container.innerHTML = cardsHTML;
}

/**
 * Handles opening equipment edit form with proper async handling.
 * @param {string} equipmentType - Type of equipment
 * @param {string} editId - Encoded equipment ID
 */
async function openEquipmentEdit(equipmentType, editId) {
    const decodedId = decodeURIComponent(editId || '');
    
    const equipmentMap = {
        'delovnePostaje': '/urediDelovnaPostaja',
        'monitorji': '/urediMonitor',
        'tiskalniki': '/urediTiskalnik',
        'rocniCitalci': '/urediRocniCitalec'
    };
    
    const editPath = equipmentMap[equipmentType];
    if (!editPath) return;
    
    try {
        await fetch('/nastaviEditID', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                EditID: decodedId,
                returnUrl: (() => {
                    const u = document.getElementById('osebaSelect').value;
                    return u ? '/opremaOsebePregled?username=' + encodeURIComponent(u) : null;
                })()
            })
        });
        window.location.href = editPath;
    } catch (err) {
        console.error('Error setting edit ID:', err);
    }
}

/**
 * Odstrani dodeljeno osebo z naprave (nastavi OznakaOsebeUporabniskoIme na null).
 * Pred izvršitvijo zahteva potrditev uporabnika in po uspešnem odstranitvi osveži prikaz.
 * @param {string} equipmentType - Tip naprave.
 * @param {string} oznaka - Enolična oznaka naprave.
 */
/**
 * Odpre potrditveni modal za odjavo uporabnika z delovne postaje.
 * @param {string} oznaka - Oznaka delovne postaje.
 */
function openUnassignModalOS(oznaka, equipmentType) {
    const config = UNASSIGN_CONFIG[equipmentType];
    if (!config) return;
    window.currentUnassignUrl = config.url;
    window.currentUnassignLabel = config.label;
    document.getElementById('unassignModalOsebeID').textContent = oznaka;
    document.querySelector('.unassignModalOsebeBody').textContent = `Ste prepričani, da želite odstraniti uporabnika z ${config.label}: ${oznaka}?`;
    bootstrap.Modal.getOrCreateInstance('#unassignModalOsebe').show();
}

/**
 * Pokliče shranjeno proceduro za označitev delovne postaje kot nerazporejene.
 * Kliče jo gumb za potrditev v modalu.
 * @param {string} oznaka - Oznaka delovne postaje.
 */
function oznaciKotNerazporejenoOS(oznaka) {
    const id = oznaka || document.getElementById('unassignModalOsebeID').textContent;
    const label = window.currentUnassignLabel || 'naprave';
    const url = window.currentUnassignUrl;
    if (!url) {
        alert(`Napaka pri odstranitvi uporabnika z ${label}.`);
        return;
    }
    fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ID: id})
    }).then(response => {
        if (response.ok) {
            loadOsebaOprema();
        } else {
            alert(`Napaka pri odstranitvi uporabnika z ${label}.`);
        }
    }).catch(err => {
        console.error('Error:', err);
        alert(`Napaka pri odstranitvi uporabnika z ${label}.`);
    });
}

async function removeEquipmentFromUser(equipmentType, oznaka) {
    if (!confirm('Ali ste prepričani, da želite odstraniti to napravo od osebe?')) {
        return;
    }
    
    try {
        let endpoint = '';
        let payload = {};
        
        // Dynamically build endpoint and payload based on equipment type using Oznaka
        if (equipmentType === 'delovnePostaje') {
            endpoint = '/urediDelovnaPostaja';
            payload = {
                OznakaDP: oznaka,
                OznakaOsebeUporabniskoIme: null
            };
        } else if (equipmentType === 'monitorji') {
            endpoint = '/urediMonitor';
            payload = {
                OznakaMonitorja: oznaka,
                OznakaOsebeUporabniskoIme: null
            };
        } else if (equipmentType === 'tiskalniki') {
            endpoint = '/urediTiskalnik';
            payload = {
                OznakaTiskalnika: oznaka,
                OznakaOsebeUporabniskoIme: null
            };
        } else if (equipmentType === 'rocniCitalci') {
            endpoint = '/urediRocniCitalec';
            payload = {
                OznakaRocnegaCitalca: oznaka,
                OznakaOsebeUporabniskoIme: null
            };
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            loadOsebaOprema();
        } else {
            alert('Napaka pri brisanju naprave');
        }
    } catch (err) {
        console.error('Error removing equipment:', err);
        alert('Napaka pri brisanju naprave');
    }
}

// Inicializacija strani: naloži podatke prijavljenega uporabnika in zapolni spustni seznam oseb
window.addEventListener("DOMContentLoaded", () => {
    resetUserSummary();
    const editSelectedUserButton = document.getElementById('editSelectedUserButton');
    if (editSelectedUserButton) {
        editSelectedUserButton.addEventListener('click', openSelectedUserEdit);
    }
    uporabnikPodatki()
        .then(data => {
            // Store user data for use in renderEquipmentList
            currentUserData = data;
            updateEditSelectedUserButton(null);
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
        })
        .then(() => loadOsebeDropdown())
        .catch(err => {
            console.error('Error loading user data:', err);
        });
});
