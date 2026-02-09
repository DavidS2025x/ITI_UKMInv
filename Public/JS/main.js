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

function tabela(url, pagLimit) {
    console.log(`Fetching data from: ${url}`);
                
    const savedLimit = localStorage.getItem('pagLimit');
    pagLimit = pagLimit !== undefined && pagLimit !== null ? Number(pagLimit) : (savedLimit ? Number(savedLimit) : 25);
    window.currentPagLimit = pagLimit;

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

            console.log("creating table with pagination limit: " + pagLimit);

            const rows = data.map(row => datacolumns.map(col => row[col]));

                window.currentGrid = new gridjs.Grid({
                columns: datacolumns,
                data: rows,
                search: true,
                sort: true,
                pagination: { enabled: true, limit: Number(pagLimit) }
            }).render(container);

            const input = container.querySelector('.gridjs-input');
            if (input) {
                input.setAttribute('placeholder', 'Išči...');
                input.setAttribute('aria-label', 'Išči...');
            }

            const table = container.querySelector('.gridjs-container');
            if (table) {
                table.classList.add('loaded');
            }

            //add pagination number selector
            const pagContainer = document.createElement('div');
            pagContainer.classList = "d-flex flex justify-content-end w-100";
            pagContainer.id = "pagContainer";

            const pagInfo = document.createElement('span');
            pagInfo.innerText = "Prikaži: ";
            pagInfo.id = "pagInfo";

            pagContainer.appendChild(pagInfo);

            const paginationOptions = [
                {id: '25', name:'pagLimit', value: 25},
                {id: '50', name:'pagLimit', value: 50},
                {id: '100', name:'pagLimit', value: 100},
                {id: '200', name:'pagLimit', value: 200}
            ]

            paginationOptions.forEach(option => {
                const radioContainer = document.createElement('div');
                radioContainer.classList = "form-check form-check-inline";

                const input = document.createElement('input');
                input.type = 'radio';
                input.id = option.id;
                input.name = option.name;
                input.value = option.value;
                input.classList = "form-check-input";
                input.style = "width: 14px !important; height: 14px !important;"
                if(option.value == pagLimit){
                    input.checked = true;
                }
                input.addEventListener('change', () => {
                    window.currentPagLimit = option.value;
                    localStorage.setItem('pagLimit', option.value);
                    tabela(url, Number(option.value));
                });

                const label = document.createElement('label');
                label.htmlFor = option.id;
                label.innerText = option.id;
                label.classList = "form-check-label";

                radioContainer.appendChild(input);
                radioContainer.appendChild(label);

                pagContainer.appendChild(radioContainer);
            });

            const head = container.querySelector('.gridjs-search');
            head.appendChild(pagContainer);

            head.classList = ("gridjs-search d-flex w-100");
        });
    }

function tabelaOsebe(url,buttonAction,pagLimit) {
    console.log(`Fetching data from: ${url}`);

    const savedLimit = localStorage.getItem('pagLimit');
    pagLimit = pagLimit !== undefined && pagLimit !== null ? Number(pagLimit) : (savedLimit ? Number(savedLimit) : 25);
    window.currentPagLimit = pagLimit;

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
                        attributes: () => ({
                            style: 'width: 120px !important; text-align: center;'
                        }),
                        formatter: (cell, row) => {
                        return gridjs.h('div', { className: 'd-flex justify-content-center align-items-center akcije'}, [
                            gridjs.h('button', {
                            className: 'btn btn-sm btn-primary me-1 actionButton', // optional spacing
                            onClick: () => alert(`Uredi: ${row.cells[0].data}`)
                            }, 'Uredi'),
                            gridjs.h('button', {
                            className: 'btn btn-sm btn-danger actionButton',
                            onClick: () => {document.getElementById('modalID').textContent = row.cells[0].data;
                                document.querySelector('.confirmModalBody').textContent = `Ste prepričani, da želite izbrisati vnos z ID: ${row.cells[0].data}?`;
                                bootstrap.Modal.getOrCreateInstance('#confirmModal').show();
                            }
                            }, 'Briši')
                        ]);
                        }
                    }
                ];

            const rows = data.map(row => datacolumns.map(col => row[col]));

                window.currentGrid = new gridjs.Grid({
                columns: columns,
                data: rows,
                search: true,
                sort: true,
                pagination: { enabled: true, limit: pagLimit }
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
                plusIcon.className = 'bi bi-plus';
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
 //add pagination number selector
            const pagContainer = document.createElement('div');
            pagContainer.classList = "d-flex flex justify-content-end w-100";
            pagContainer.id = "pagContainer";

            const pagInfo = document.createElement('span');
            pagInfo.innerText = "Prikaži: ";
            pagInfo.id = "pagInfo";

            pagContainer.appendChild(pagInfo);

            const paginationOptions = [
                {id: '25', name:'pagLimit', value: 25},
                {id: '50', name:'pagLimit', value: 50},
                {id: '100', name:'pagLimit', value: 100},
                {id: '200', name:'pagLimit', value: 200}
            ]

            paginationOptions.forEach(option => {
                const radioContainer = document.createElement('div');
                radioContainer.classList = "form-check form-check-inline";

                const input = document.createElement('input');
                input.type = 'radio';
                input.id = option.id;
                input.name = option.name;
                input.value = option.value;
                input.classList = "form-check-input";
                input.style = "width: 14px !important; height: 14px !important;"
                if(option.value == pagLimit){
                    input.checked = true;
                }
                input.addEventListener('change', () => {
                    window.currentPagLimit = option.value;
                    localStorage.setItem('pagLimit', option.value);
                    tabela(url, Number(option.value));
                });

                const label = document.createElement('label');
                label.htmlFor = option.id;
                label.innerText = option.id;
                label.classList = "form-check-label";

                radioContainer.appendChild(input);
                radioContainer.appendChild(label);

                pagContainer.appendChild(radioContainer);
            });
            head.appendChild(pagContainer);

            head.classList = ("gridjs-search d-flex w-100");
        });
}

function tabelaUporabniki(url,buttonAction,pagLimit) {
    console.log(`Fetching data from: ${url}`);
    const savedLimit = localStorage.getItem('pagLimit');
    pagLimit = pagLimit !== undefined && pagLimit !== null ? Number(pagLimit) : (savedLimit ? Number(savedLimit) : 25);
    window.currentPagLimit = pagLimit;
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
                        attributes: () => ({
                            style: 'width: 120px !important; text-align: center;'
                        }),
                        formatter: (cell, row) => {
                        return gridjs.h('div', { className: 'd-flex justify-content-center align-items-center akcije'}, [
                            gridjs.h('button', {
                            className: 'btn btn-sm btn-primary me-1 actionButton', // optional spacing
                            onClick: () => alert(`Uredi: ${row.cells[0].data}`)
                            }, 'Uredi'),
                            gridjs.h('button', {
                            className: 'btn btn-sm btn-danger actionButton',
                            onClick: () => {document.getElementById('modalID').textContent = row.cells[0].data;
                                document.querySelector('.confirmModalBody').textContent = `Ste prepričani, da želite izbrisati vnos z ID: ${row.cells[0].data}?`;
                                bootstrap.Modal.getOrCreateInstance('#confirmModal').show();
                            }
                            }, 'Briši')
                        ]);
                        }
                    }
                ];

            const rows = data.map(row => datacolumns.map(col => row[col]));

                window.currentGrid = new gridjs.Grid({
                columns: columns,
                data: rows,
                search: true,
                sort: true,
                pagination: { enabled: true, limit: pagLimit }
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
                plusIcon.className = 'bi bi-plus';
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
             //add pagination number selector
            const pagContainer = document.createElement('div');
            pagContainer.classList = "d-flex flex justify-content-end w-100";
            pagContainer.id = "pagContainer";

            const pagInfo = document.createElement('span');
            pagInfo.innerText = "Prikaži: ";
            pagInfo.id = "pagInfo";

            pagContainer.appendChild(pagInfo);

            const paginationOptions = [
                {id: '25', name:'pagLimit', value: 25},
                {id: '50', name:'pagLimit', value: 50},
                {id: '100', name:'pagLimit', value: 100},
                {id: '200', name:'pagLimit', value: 200}
            ]

            paginationOptions.forEach(option => {
                const radioContainer = document.createElement('div');
                radioContainer.classList = "form-check form-check-inline";

                const input = document.createElement('input');
                input.type = 'radio';
                input.id = option.id;
                input.name = option.name;
                input.value = option.value;
                input.classList = "form-check-input";
                input.style = "width: 14px !important; height: 14px !important;"
                if(option.value == pagLimit){
                    input.checked = true;
                }
                input.addEventListener('change', () => {
                    window.currentPagLimit = option.value;
                    localStorage.setItem('pagLimit', option.value);
                    tabela(url, Number(option.value));
                });

                const label = document.createElement('label');
                label.htmlFor = option.id;
                label.innerText = option.id;
                label.classList = "form-check-label";

                radioContainer.appendChild(input);
                radioContainer.appendChild(label);

                pagContainer.appendChild(radioContainer);
            });

            head.appendChild(pagContainer);

            head.classList = ("gridjs-search d-flex w-100");
        });
}

function tabelaDelovnePostaje(url,buttonAction,pagLimit) {
    console.log(`Fetching data from: ${url}`);
    const savedLimit = localStorage.getItem('pagLimit');
    pagLimit = pagLimit !== undefined && pagLimit !== null ? Number(pagLimit) : (savedLimit ? Number(savedLimit) : 25);
    window.currentPagLimit = pagLimit;
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
                        attributes: () => ({
                            style: 'width: 120px !important; text-align: center;'
                        }),
                        formatter: (cell, row) => {
                        return gridjs.h('div', { className: 'd-flex justify-content-center align-items-center akcije'}, [
                            gridjs.h('button', {
                            className: 'btn btn-sm btn-primary me-1 actionButton', // optional spacing
                            onClick: () => alert(`Uredi: ${row.cells[0].data}`)
                            }, 'Uredi'),
                            gridjs.h('button', {
                            className: 'btn btn-sm btn-danger actionButton',
                            onClick: () => {document.getElementById('modalID').textContent = row.cells[0].data;
                                document.querySelector('.confirmModalBody').textContent = `Ste prepričani, da želite izbrisati vnos z ID: ${row.cells[0].data}?`;
                                bootstrap.Modal.getOrCreateInstance('#confirmModal').show();
                            }
                            }, 'Briši')
                        ]);
                        }
                    }
                ];

            const rows = data.map(row => datacolumns.map(col => row[col]));

                window.currentGrid = new gridjs.Grid({
                columns: columns,
                data: rows,
                search: true,
                sort: true,
                pagination: { enabled: true, limit: pagLimit }
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
                plusIcon.className = 'bi bi-plus';
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
             //add pagination number selector
            const pagContainer = document.createElement('div');
            pagContainer.classList = "d-flex flex justify-content-end w-100";
            pagContainer.id = "pagContainer";

            const pagInfo = document.createElement('span');
            pagInfo.innerText = "Prikaži: ";
            pagInfo.id = "pagInfo";

            pagContainer.appendChild(pagInfo);

            const paginationOptions = [
                {id: '25', name:'pagLimit', value: 25},
                {id: '50', name:'pagLimit', value: 50},
                {id: '100', name:'pagLimit', value: 100},
                {id: '200', name:'pagLimit', value: 200}
            ]

            paginationOptions.forEach(option => {
                const radioContainer = document.createElement('div');
                radioContainer.classList = "form-check form-check-inline";

                const input = document.createElement('input');
                input.type = 'radio';
                input.id = option.id;
                input.name = option.name;
                input.value = option.value;
                input.classList = "form-check-input";
                input.style = "width: 14px !important; height: 14px !important;"
                if(option.value == pagLimit){
                    input.checked = true;
                }
                input.addEventListener('change', () => {
                    window.currentPagLimit = option.value;
                    localStorage.setItem('pagLimit', option.value);
                    tabela(url, Number(option.value));
                });

                const label = document.createElement('label');
                label.htmlFor = option.id;
                label.innerText = option.id;
                label.classList = "form-check-label";

                radioContainer.appendChild(input);
                radioContainer.appendChild(label);

                pagContainer.appendChild(radioContainer);
            });

            head.appendChild(pagContainer);

            head.classList = ("gridjs-search d-flex w-100");
        });
}

function tabelaMonitorji(url,buttonAction,pagLimit) {
    console.log(`Fetching data from: ${url}`);
    const savedLimit = localStorage.getItem('pagLimit');
    pagLimit = pagLimit !== undefined && pagLimit !== null ? Number(pagLimit) : (savedLimit ? Number(savedLimit) : 25);
    window.currentPagLimit = pagLimit;
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
                        attributes: () => ({
                            style: 'width: 120px !important; text-align: center;'
                        }),
                        formatter: (cell, row) => {
                        return gridjs.h('div', { className: 'd-flex justify-content-center align-items-center akcije'}, [
                            gridjs.h('button', {
                            className: 'btn btn-sm btn-primary me-1 actionButton', // optional spacing
                            onClick: () => alert(`Uredi: ${row.cells[0].data}`)
                            }, 'Uredi'),
                            gridjs.h('button', {
                            className: 'btn btn-sm btn-danger actionButton',
                            onClick: () => {document.getElementById('modalID').textContent = row.cells[0].data;
                                document.querySelector('.confirmModalBody').textContent = `Ste prepričani, da želite izbrisati vnos z ID: ${row.cells[0].data}?`;
                                bootstrap.Modal.getOrCreateInstance('#confirmModal').show();
                            }
                            }, 'Briši')
                        ]);
                        }
                    }
                ];

            const rows = data.map(row => datacolumns.map(col => row[col]));

                window.currentGrid = new gridjs.Grid({
                columns: columns,
                data: rows,
                search: true,
                sort: true,
                pagination: { enabled: true, limit: pagLimit }
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
                plusIcon.className = 'bi bi-plus';
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
             //add pagination number selector
            const pagContainer = document.createElement('div');
            pagContainer.classList = "d-flex flex justify-content-end w-100";
            pagContainer.id = "pagContainer";

            const pagInfo = document.createElement('span');
            pagInfo.innerText = "Prikaži: ";
            pagInfo.id = "pagInfo";

            pagContainer.appendChild(pagInfo);

            const paginationOptions = [
                {id: '25', name:'pagLimit', value: 25},
                {id: '50', name:'pagLimit', value: 50},
                {id: '100', name:'pagLimit', value: 100},
                {id: '200', name:'pagLimit', value: 200}
            ]

            paginationOptions.forEach(option => {
                const radioContainer = document.createElement('div');
                radioContainer.classList = "form-check form-check-inline";

                const input = document.createElement('input');
                input.type = 'radio';
                input.id = option.id;
                input.name = option.name;
                input.value = option.value;
                input.classList = "form-check-input";
                input.style = "width: 14px !important; height: 14px !important;"
                if(option.value == pagLimit){
                    input.checked = true;
                }
                input.addEventListener('change', () => {
                    window.currentPagLimit = option.value;
                    localStorage.setItem('pagLimit', option.value);
                    tabela(url, Number(option.value));
                });

                const label = document.createElement('label');
                label.htmlFor = option.id;
                label.innerText = option.id;
                label.classList = "form-check-label";

                radioContainer.appendChild(input);
                radioContainer.appendChild(label);

                pagContainer.appendChild(radioContainer);
            });

            head.appendChild(pagContainer);

            head.classList = ("gridjs-search d-flex w-100");
        });
}

window.uporabnikPodatki = uporabnikPodatki;
window.logout = logout;
window.addNavigationLinks = addNavigationLinks;
window.tabela = tabela;
window.tabelaOsebe = tabelaOsebe;
window.tabelaUporabniki = tabelaUporabniki;
window.tabelaDelovnePostaje = tabelaDelovnePostaje;
window.tabelaMonitorji = tabelaMonitorji;