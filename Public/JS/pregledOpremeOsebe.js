/// <reference path="./main.js" />

/**
 * Pregled opreme osebe – stran za prikaz vseh naprav, dodeljenih izbrani osebi.
 * Prikazuje delovne postaje, monitorje, tiskalnike in ročne čitalce v ločenih karticah.
 * Uporabniki z dovoljenjem UREJANJE_OPREME imajo na voljo gumbe za urejanje in odstranjevanje.
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
        
        osebe.forEach(oseba => {
            const option = document.createElement('option');
            option.value = oseba['UporabniskoIme'];
            option.textContent = oseba['Ime'];
            select.appendChild(option);
        });
        
        select.addEventListener('change', loadOsebaOprema);
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
    
    if (!uporabniskoIme) {
        document.getElementById('delovnePostajeContainer').innerHTML = '<p class="text-muted text-center">Izberite osebo za prikaz podatkov</p>';
        document.getElementById('monitorjiContainer').innerHTML = '<p class="text-muted text-center">Izberite osebo za prikaz podatkov</p>';
        document.getElementById('tiskalnikContainer').innerHTML = '<p class="text-muted text-center">Izberite osebo za prikaz podatkov</p>';
        document.getElementById('rocniCitalecContainer').innerHTML = '<p class="text-muted text-center">Izberite osebo za prikaz podatkov</p>';
        document.getElementById('countDelovnePostaje').textContent = '[0]';
        document.getElementById('countMonitorji').textContent = '[0]';
        document.getElementById('countTiskalniki').textContent = '[0]';
        document.getElementById('countRocniCitalci').textContent = '[0]';
        return;
    }
    
    try {
        // Fetch delovne postaje
        const dpResponse = await fetch(`/osebDelovnePostaje?username=${encodeURIComponent(uporabniskoIme)}`);
        const delovnePostaje = dpResponse.ok ? await dpResponse.json() : [];
        
        // Fetch monitorji
        const mResponse = await fetch(`/osebMonitorji?username=${encodeURIComponent(uporabniskoIme)}`);
        const monitorji = mResponse.ok ? await mResponse.json() : [];
        
        // Fetch tiskalniki
        const tResponse = await fetch(`/osebTiskalniki?username=${encodeURIComponent(uporabniskoIme)}`);
        const tiskalniki = tResponse.ok ? await tResponse.json() : [];
        
        // Fetch ročni čitalci
        const rcResponse = await fetch(`/osebRocniCitalci?username=${encodeURIComponent(uporabniskoIme)}`);
        const rocniCitalci = rcResponse.ok ? await rcResponse.json() : [];
        
        // Render data
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
    }
}

/**
 * Izže HTML seznam naprav v podani vsebnik.
 * Če ima uporabnik dovoljenje za urejanje, doda gumbe za urejanje in odstranjevanje.
 * @param {Array} data - Niz naprav za prikaz.
 * @param {string} containerId - ID vsebnika, v katerega se izriše seznam.
 * @param {string} countSpanId - ID elementa za prikaz števila naprav v glavi kartice.
 * @param {string} equipmentType - Tip naprave ('delovnePostaje', 'monitorji', 'tiskalniki', 'rocniCitalci').
 * @param {object} userData - Podatki prijavljenega uporabnika za preverjanje dovoljenj.
 */
function renderEquipmentList(data, containerId, countSpanId, equipmentType, userData) {
    const container = document.getElementById(containerId);
    const countSpan = document.getElementById(countSpanId);
    const hasEditPermission = userData && userData.dovoljenja?.includes('UREJANJE_OPREME');
    
    // Update count in header
    if (countSpan) {
        countSpan.textContent = `[${data ? data.length : 0}]`;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Ni naprav</p>';
        return;
    }
    
    const list = document.createElement('ul');
    list.className = 'list-unstyled';
    
    data.forEach(item => {
        const li = document.createElement('li');
        li.className = 'mb-2 pb-2 border-bottom d-flex justify-content-between align-items-center';
        
        // Use Oznaka as the device identifier
        const oznaka = item['Oznaka'];
        
        let buttonsHTML = '';
        if (hasEditPermission) {
            const unassignData = UNASSIGN_CONFIG[equipmentType];
            const unassignBtn = unassignData ? `
                    <button class="unassign-btn" style="background: none; border: none; padding: 0.25rem; cursor: pointer; display: flex; align-items: center; transition: color 0.2s;" onclick="openUnassignModalOS('${oznaka}', '${equipmentType}')" title="Označi kot nerazporejeno" onmouseover="this.querySelector('i').style.color='#e8590c'" onmouseout="this.querySelector('i').style.color='#fd7e14'">
                        <i class="bi bi-person-dash-fill" style="font-size: 1rem; color: #fd7e14;"></i>
                    </button>` : '';
            buttonsHTML = `
                <div class="d-flex gap-1">
                    <button class="edit-btn" style="background: none; border: none; padding: 0.25rem; cursor: pointer; display: flex; align-items: center; transition: color 0.2s;" onclick="editEquipment('${equipmentType}', '${oznaka}')" title="Uredi" onmouseover="this.querySelector('i').style.color='#495057'" onmouseout="this.querySelector('i').style.color='#6c757d'">
                        <i class="bi bi-pencil-square" style="font-size: 1rem; color: #6c757d;"></i>
                    </button>
                    ${unassignBtn}
                </div>
            `;
        }
        
        li.innerHTML = `
            <small class="text-dark fw-500">${oznaka}</small>
            ${buttonsHTML}
        `;
        list.appendChild(li);
    });
    
    container.innerHTML = '';
    container.appendChild(list);
}

/**
 * Nastavi ID naprave za urejanje v sejo in preusmeri na ustrezen obrazec za urejanje.
 * @param {string} equipmentType - Tip naprave ('delovnePostaje', 'monitorji', 'tiskalniki', 'rocniCitalci').
 * @param {string} oznaka - Enolična oznaka naprave.
 */
function editEquipment(equipmentType, oznaka) {
    const equipmentMap = {
        'delovnePostaje': '/urediDelovnaPostaja',
        'monitorji': '/urediMonitor',
        'tiskalniki': '/urediTiskalnik',
        'rocniCitalci': '/urediRocniCitalec'
    };
    
    const editUrl = equipmentMap[equipmentType];
    if (editUrl) {
        fetch('/nastaviEditID', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({EditID: oznaka})
        }).then(() => {
            window.location.href = editUrl;
        });
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
    uporabnikPodatki()
        .then(data => {
            // Store user data for use in renderEquipmentList
            currentUserData = data;
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
        })
        .then(() => loadOsebeDropdown())
        .catch(err => {
            console.error('Error loading user data:', err);
        });
});
