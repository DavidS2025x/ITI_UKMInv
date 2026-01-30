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
        { label: 'Osebe', href: '/osebaPregled', permission: 'D_UrejanjeUporabnikov'},
        { label: 'Šifranti', href: '/sifrantiPregled', permission: 'D_UrejanjeUporabnikov' }, 
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

function tabela(url, deleteurl ,buttonAction) {
    console.log(`Fetching data from: ${url}`);
    fetch(url)
        .then(r => r.json())
        .then(data => {
            if (!data.length) return;
            const container = document.getElementById("table-responsive");
            
            // Destroy previous grid instance if exists
            if (window.currentGrid) {
                window.currentGrid.destroy();
            }
            container.innerHTML = "";

            const datacolumns = Object.keys(data[0]);
            console.log(datacolumns);
            const columns = [
                ...datacolumns,
                    {
                        name: 'Akcije',
                        formatter: (cell, row) => {
                        return gridjs.h('div', { className: 'd-flex justify-content-center align-items-center'}, [
                            gridjs.h('button', {
                            className: 'btn btn-sm btn-primary me-1', // optional spacing
                            onClick: () => alert(`Uredi: ${row.cells[0].data}`)
                            }, 'Uredi'),
                            gridjs.h('button', {
                            className: 'btn btn-sm btn-danger',
                            onClick: () => fetch(`${deleteurl}/`, {method: 'POST', body: JSON.stringify({"ID": row.cells[0].data}), headers: {'Content-Type': 'application/json'}}).then(() => {tabela(url, deleteurl ,buttonAction);})
                            }, 'Briši')
                        ]);
                        }
                    }
                ];

            const rows = data.map(row => datacolumns.map(col => row[col]));

            window.currentGrid = new gridjs.Grid({
                columns,
                data: rows,
                search: true,
                sort: true,
                pagination: { enabled: true, limit: 10 }
            }).render(container);

            const input = container.querySelector('.gridjs-input');
            if (input) {
                input.setAttribute('placeholder', 'Išči...');
                input.setAttribute('aria-label', 'Išči...');
            }

            const head = container.querySelector('.gridjs-search');
            console.log(head);
            if (head) {
                const plusIcon = document.createElement('i');
                plusIcon.className = 'bi bi-plus-lg';
                const buttonAdd = document.createElement('button');
                buttonAdd.className = 'btn btn-sm btn-primary ms-2 d-flex justify-content-center align-items-center';
                buttonAdd.appendChild(plusIcon);
                buttonAdd.onclick = () => window.location.href = buttonAction;
                head.appendChild(buttonAdd);
            }

            const table = container.querySelector('.gridjs-container');
            if (table) {
                table.classList.add('loaded');
            }
        });
    }

window.uporabnikPodatki = uporabnikPodatki;
window.logout = logout;
window.addNavigationLinks = addNavigationLinks;
window.tabela = tabela;