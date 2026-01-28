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
    return userData;
};

async function addNavigationLinks(userData) {
    const navLinksContainer = document.getElementById('navLinksContainer');
    navLinksContainer.innerHTML = ' ';

    const links = [
        { label: 'Nadzorna plošča', href: '/nadzornaPlosca', permission: 'D_OgledNadzornePlosce' },
        { label: 'Oprema', href: '/opremaPregled', permission: 'D_PregledOpreme' },
        { label: 'Osebe', href: '/osebaPregled', permission: 'D_UrejanjeUporabnikov'}
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

/*
function generateActionButtons(userData) {
    const buttonContainer = document.getElementById('actionButtons');
    const buttons = [];
    
    // Define button configurations with their permission checks
    const buttonConfigs = [
        {
            label: 'Pregled Opreme',
            permission: 'D_PregledOpreme',
            icon: '👁️',
            color: 'btn-primary'
        },
        {
            label: 'Dodaj Opremo',
            permission: 'D_DodajanjeOpreme',
            icon: '➕',
            color: 'btn-success'
        },
        {
            label: 'Uredi Opremo',
            permission: 'D_UrejanjeOpreme',
            icon: '✏️',
            color: 'btn-warning'
        },
        {
            label: 'Briši Opremo',
            permission: 'D_BrisanjeOpreme',
            icon: '🗑️',
            color: 'btn-danger'
        },
        {
            label: 'Uredi Uporabnike',
            permission: 'D_UrejanjeUporabnikov',
            icon: '👥',
            color: 'btn-info'
        }
    ];
    
    // Generate buttons only if user has permission
    buttonConfigs.forEach(config => {
        if (userData[config.permission] === 1) {
            const button = document.createElement('button');
            button.className = `btn ${config.color} me-2 mb-2`;
            button.style.fontSize = '0.95rem';
            button.innerHTML = `${config.icon} ${config.label}`;
            button.type = 'button';
            button.onclick = () => console.log(`Clicked: ${config.label}`);
            buttons.push(button);
        }
    });
    
    // Clear and populate button container
    buttonContainer.innerHTML = '';
    if (buttons.length > 0) {
        buttons.forEach(btn => buttonContainer.appendChild(btn));
    } else {
        buttonContainer.innerHTML = '<p class="text-muted">No permissions available</p>';
    }
}
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

window.uporabnikPodatki = uporabnikPodatki;
window.logout = logout;
window.addNavigationLinks = addNavigationLinks;
//window.generateActionButtons = generateActionButtons;