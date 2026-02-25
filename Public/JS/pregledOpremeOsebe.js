/// <reference path="./main.js" />
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

let currentUserData = null;

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

function renderEquipmentList(data, containerId, countSpanId, equipmentType, userData) {
    const container = document.getElementById(containerId);
    const countSpan = document.getElementById(countSpanId);
    const hasEditPermission = userData && userData.D_UrejanjeOpreme === 1;
    
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
            buttonsHTML = `
                <div class="d-flex gap-1">
                    <button class="edit-btn" style="background: none; border: none; padding: 0.25rem; cursor: pointer; display: flex; align-items: center; transition: color 0.2s;" onclick="editEquipment('${equipmentType}', '${oznaka}')" title="Uredi" onmouseover="this.querySelector('i').style.color='#495057'" onmouseout="this.querySelector('i').style.color='#6c757d'">
                        <i class="bi bi-pencil-square" style="font-size: 1rem; color: #6c757d;"></i>
                    </button>
                    <button class="delete-btn" style="background: none; border: none; padding: 0.25rem; cursor: pointer; display: flex; align-items: center; transition: color 0.2s;" onclick="removeEquipmentFromUser('${equipmentType}', '${oznaka}', '${oznaka}')" title="Odstrani" onmouseover="this.querySelector('i').style.color='#c82333'" onmouseout="this.querySelector('i').style.color='#dc3545'">
                        <i class="bi bi-trash-fill" style="font-size: 1rem; color: #dc3545;"></i>
                    </button>
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
