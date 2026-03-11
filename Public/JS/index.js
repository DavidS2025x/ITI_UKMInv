/// <reference path="./main.js" />

/**
 * Nadzorna plošča (index) – inicializira KPI števce, grafe po letih in po enotah,
 * ter filter za starost naprav z ohranjevanjem vrednosti v localStorage.
 */

/** Referenca na instanco grafa nakupov po letih (Chart.js). */
let grafNakupiPoLetih = null;
/** Referenca na instanco grafa naprav po enotah (Chart.js). */
let grafNapravePoEnoti = null;
/** Referenca na instanco grafa naprav po službah (Chart.js). */
let grafNapravePoSluzbi = null;
/** Referenca na instanco grafa naprav po nadstropjih (Chart.js). */
let grafNapravePoNadstropjih = null;
/** Referenca na instanco grafa naprav po statusu (Chart.js). */
let grafNapravePoStatusu = null;
/** Indeks aktivnega nabora podatkov v grafu nakupov (za toggle legend). */
let activeDatasetNakupi = null;
/** Indeks aktivnega nabora podatkov v grafu naprav po enotah (za toggle legend). */
let activeDatasetNaprave = null;
/** Indeks aktivnega nabora podatkov v grafu naprav po službah (za toggle legend). */
let activeDatasetSluzbe = null;
/** Indeks aktivnega nabora podatkov v grafu naprav po nadstropjih (za toggle legend). */
let activeDatasetNadstropja = null;
/** Indeks aktivnega nabora podatkov v grafu naprav po statusu (za toggle legend). */
let activeDatasetStatusu = null;
/** Ključ za shranjevanje filtra starosti naprav v localStorage. */
const STAROST_STORAGE_KEY = 'starostNaprave';
/** Ključ za shranjevanje izbrane lokacije na nadzorni plošči. */
const LOKACIJA_STORAGE_KEY = 'dashboardLokacija';
/** Preslikava lokacija -> nadstropje za prikaz ob dropdownu. */
const lokacijaNadstropjeMap = new Map();

/**
 * Prebere shranjeno vrednost filtra starosti iz localStorage.
 * @returns {number} Shranjena vrednost starosti ali 0, če vrednost ni nastavljena.
 */
function preberiStarostShranjeno() {
    const saved = localStorage.getItem(STAROST_STORAGE_KEY);
    const parsed = parseInt(saved, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function preberiLokacijoShranjeno() {
    return localStorage.getItem(LOKACIJA_STORAGE_KEY) || '';
}

/**
 * Nastavi besedilno vsebino elementa z lokaliziranim formatiranjem za slovenščino.
 * @param {string} id - ID HTML elementa.
 * @param {number|string} value - Vrednost za prikaz (privzeto 0, če je prazna).
 */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = Number(value || 0).toLocaleString('sl-SI');
    }
}

const SKLADISCE_NAPRAVE_CONFIG = {
    delovnePostaje: {
        modalNaslov: 'Delovne postaje v skladišču',
        editPath: '/urediDelovnaPostaja'
    },
    monitorji: {
        modalNaslov: 'Monitorji v skladišču',
        editPath: '/urediMonitor'
    },
    tiskalniki: {
        modalNaslov: 'Tiskalniki v skladišču',
        editPath: '/urediTiskalnik'
    },
    rocniCitalci: {
        modalNaslov: 'Ročni čitalci v skladišču',
        editPath: '/urediRocniCitalec'
    }
};

const SKUPNA_RABA_NAPRAVE_CONFIG = {
    delovnePostaje: {
        modalNaslov: 'Delovne postaje v skupni rabi',
        editPath: '/urediDelovnaPostaja'
    },
    monitorji: {
        modalNaslov: 'Monitorji v skupni rabi',
        editPath: '/urediMonitor'
    },
    tiskalniki: {
        modalNaslov: 'Tiskalniki v skupni rabi',
        editPath: '/urediTiskalnik'
    },
    rocniCitalci: {
        modalNaslov: 'Ročni čitalci v skupni rabi',
        editPath: '/urediRocniCitalec'
    }
};

const LOKACIJA_NAPRAVE_CONFIG = {
    delovnePostaje: {
        modalNaslov: 'Delovne postaje na lokaciji',
        editPath: '/urediDelovnaPostaja'
    },
    monitorji: {
        modalNaslov: 'Monitorji na lokaciji',
        editPath: '/urediMonitor'
    },
    tiskalniki: {
        modalNaslov: 'Tiskalniki na lokaciji',
        editPath: '/urediTiskalnik'
    },
    rocniCitalci: {
        modalNaslov: 'Ročni čitalci na lokaciji',
        editPath: '/urediRocniCitalec'
    }
};

const STAROST_NAPRAVE_CONFIG = {
    delovnePostaje: {
        modalNaslov: 'Starejše delovne postaje',
        editPath: '/urediDelovnaPostaja'
    },
    monitorji: {
        modalNaslov: 'Starejši monitorji',
        editPath: '/urediMonitor'
    },
    tiskalniki: {
        modalNaslov: 'Starejši tiskalniki',
        editPath: '/urediTiskalnik'
    },
    rocniCitalci: {
        modalNaslov: 'Starejši ročni čitalci',
        editPath: '/urediRocniCitalec'
    }
};

function prikaziSkladisceNapraveModal(vnosi, tip, mode = 'skladisce', titleSuffix = '') {
    const modalTitleEl = document.getElementById('skladisceNapraveModalLabel');
    const modalBodyEl = document.getElementById('skladisceNapraveModalBody');
    const configMapByMode = {
        skladisce: SKLADISCE_NAPRAVE_CONFIG,
        skupnaRaba: SKUPNA_RABA_NAPRAVE_CONFIG,
        lokacija: LOKACIJA_NAPRAVE_CONFIG,
        starost: STAROST_NAPRAVE_CONFIG
    };
    const configMap = configMapByMode[mode] || SKLADISCE_NAPRAVE_CONFIG;
    const config = configMap[tip];

    if (!modalTitleEl || !modalBodyEl || !config) return;

    modalTitleEl.textContent = titleSuffix ? `${config.modalNaslov} - ${titleSuffix}` : config.modalNaslov;

    if (!Array.isArray(vnosi) || vnosi.length === 0) {
        modalBodyEl.innerHTML = '<div class="text-muted">Ni najdenih naprav.</div>';
        return;
    }

    const canEdit = typeof globalUserData !== 'undefined' && globalUserData?.dovoljenja?.includes('UREJANJE_OPREME');
    const prikaznaPolja = Object.keys(vnosi[0] || {}).filter(key => key !== 'EditID');

    const rowsHtml = vnosi.map(vnos => {
        const encodedEditId = encodeURIComponent(vnos.EditID || '');
        const naslovPolje = prikaznaPolja[0];
        const naslovVrednost = naslovPolje ? (vnos[naslovPolje] ?? '-') : '-';

        const podrobnostiHtml = prikaznaPolja
            .slice(1)
            .map(polje => `<div class="small text-muted">${polje}: ${vnos[polje] ?? '-'}</div>`)
            .join('');

        return `
            <div class="d-flex justify-content-between align-items-start border rounded p-2 mb-2">
                <div>
                    <div><strong>${naslovPolje}: ${naslovVrednost}</strong></div>
                    ${podrobnostiHtml}
                </div>
                ${canEdit ? `<button type="button" style="background: none; border: none; padding: 0.25rem 0.5rem; cursor: pointer; display: flex; align-items: center; transition: color 0.2s;" data-edit-id="${encodedEditId}" title="Uredi" onmouseover="this.style.color='#495057'" onmouseout="this.style.color='#6c757d'"><i class="bi bi-pencil-square" style="font-size: 1rem; color: #6c757d;"></i></button>` : ''}
            </div>
        `;
    }).join('');

    modalBodyEl.innerHTML = rowsHtml;

    if (canEdit) {
        modalBodyEl.querySelectorAll('[data-edit-id]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = decodeURIComponent(btn.getAttribute('data-edit-id') || '');
                await odpriUrejanjeNaprave(id, config.editPath);
            });
        });
    }
}

async function odpriUrejanjeNaprave(id, editPath) {
    if (!id || !editPath) return;
    await fetch('/nastaviEditID', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ EditID: id })
    });
    window.location.href = editPath;
}

async function odpriSkladisceNapraveModal(tip) {
    const modalBodyEl = document.getElementById('skladisceNapraveModalBody');
    const modalEl = document.getElementById('skladisceNapraveModal');
    if (!modalBodyEl || !modalEl) return;

    modalBodyEl.innerHTML = '<div class="text-muted">Nalaganje...</div>';
    bootstrap.Modal.getOrCreateInstance(modalEl).show();

    try {
        const response = await fetch(`/nadzornaPlosca/skladisceNaprave/${tip}`);
        if (!response.ok) throw new Error('Napaka pri pridobivanju naprav iz skladišča');

        const payload = await response.json();
        prikaziSkladisceNapraveModal(payload.vnosi, tip);
    } catch (err) {
        console.error('Napaka pri odpiranju modala skladišča:', err);
        modalBodyEl.innerHTML = '<div class="text-danger">Napaka pri pridobivanju podatkov.</div>';
    }
}

async function odpriSkupnaRabaNapraveModal(tip) {
    const modalBodyEl = document.getElementById('skladisceNapraveModalBody');
    const modalEl = document.getElementById('skladisceNapraveModal');
    if (!modalBodyEl || !modalEl) return;

    modalBodyEl.innerHTML = '<div class="text-muted">Nalaganje...</div>';
    bootstrap.Modal.getOrCreateInstance(modalEl).show();

    try {
        const response = await fetch(`/nadzornaPlosca/skupnaRabaNaprave/${tip}`);
        if (!response.ok) throw new Error('Napaka pri pridobivanju naprav v skupni rabi');

        const payload = await response.json();
        prikaziSkladisceNapraveModal(payload.vnosi, tip, 'skupnaRaba');
    } catch (err) {
        console.error('Napaka pri odpiranju modala skupne rabe:', err);
        modalBodyEl.innerHTML = '<div class="text-danger">Napaka pri pridobivanju podatkov.</div>';
    }
}

async function odpriLokacijaNapraveModal(tip) {
    const modalBodyEl = document.getElementById('skladisceNapraveModalBody');
    const modalEl = document.getElementById('skladisceNapraveModal');
    const lokacijaSelect = document.getElementById('lokacijaDashboardSelect');
    if (!modalBodyEl || !modalEl || !lokacijaSelect) return;

    const oznakaLokacije = lokacijaSelect.value;
    if (!oznakaLokacije) {
        modalBodyEl.innerHTML = '<div class="text-muted">Najprej izberite lokacijo.</div>';
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
        return;
    }

    const selectedLabel = lokacijaSelect.options[lokacijaSelect.selectedIndex]?.text || oznakaLokacije;
    modalBodyEl.innerHTML = '<div class="text-muted">Nalaganje...</div>';
    bootstrap.Modal.getOrCreateInstance(modalEl).show();

    try {
        const response = await fetch(`/nadzornaPlosca/lokacijaNaprave/${tip}?oznakaLokacije=${encodeURIComponent(oznakaLokacije)}`);
        if (!response.ok) throw new Error('Napaka pri pridobivanju naprav po lokaciji');

        const payload = await response.json();
        prikaziSkladisceNapraveModal(payload.vnosi, tip, 'lokacija', selectedLabel);
    } catch (err) {
        console.error('Napaka pri odpiranju modala lokacije:', err);
        modalBodyEl.innerHTML = '<div class="text-danger">Napaka pri pridobivanju podatkov.</div>';
    }
}

async function odpriStarejseNapraveModal(tip) {
    const modalBodyEl = document.getElementById('skladisceNapraveModalBody');
    const modalEl = document.getElementById('skladisceNapraveModal');
    const starostInput = document.getElementById('starostInput');
    if (!modalBodyEl || !modalEl || !starostInput) return;

    const parsedStarost = parseInt(starostInput.value, 10);
    const starost = Number.isFinite(parsedStarost) ? parsedStarost : 0;

    modalBodyEl.innerHTML = '<div class="text-muted">Nalaganje...</div>';
    bootstrap.Modal.getOrCreateInstance(modalEl).show();

    try {
        const response = await fetch(`/nadzornaPlosca/starejseNaprave/${tip}?starost=${encodeURIComponent(starost)}`);
        if (!response.ok) throw new Error('Napaka pri pridobivanju starejših naprav');

        const payload = await response.json();
        prikaziSkladisceNapraveModal(payload.vnosi, tip, 'starost', `${starost} let`);
    } catch (err) {
        console.error('Napaka pri odpiranju modala starejših naprav:', err);
        modalBodyEl.innerHTML = '<div class="text-danger">Napaka pri pridobivanju podatkov.</div>';
    }
}

/**
 * Pretvori seznam vnosov s polji Leto in Stevilo v Map za hitro iskanje po letu.
 * @param {Array} vnosi - Niz objektov z lastnostima Leto in Stevilo.
 * @returns {Map<number, number>} Mapa {leto -> število naprav}.
 */
function pripraviLetoMap(vnosi) {
    const mapa = new Map();
    (vnosi || []).forEach(vnos => {
        const leto = Number(vnos.Leto);
        const stevilo = Number(vnos.Stevilo || 0);
        if (!Number.isNaN(leto)) {
            mapa.set(leto, stevilo);
        }
    });
    return mapa;
}

/**
 * Zgradi zaporedno tabelo let med minLeto in maxLeto (vključno).
 * @param {number} minLeto - Začetno leto.
 * @param {number} maxLeto - Končno leto.
 * @returns {number[]} Tabela let ali prazen niz, če so parametri neveljavni.
 */
function zgradiLeta(minLeto, maxLeto) {
    if (!minLeto || !maxLeto || maxLeto < minLeto) {
        return [];
    }

    const leta = [];
    for (let leto = minLeto; leto <= maxLeto; leto += 1) {
        leta.push(leto);
    }
    return leta;
}

/**
 * Nariše ali osveži stolpični graf nakupov naprav po letu proizvodnje.
 * Ob ponovnem klicu uniči obstoječi graf in ga nadomesti z novim.
 * @param {object} grafData - Podatki za graf iz strežniškega odziva (/nadzornaPlosca/grafPoLetih).
 */
function narisiGrafPoLetih(grafData) {
    const minLeto = Number(grafData?.minLeto || 0);
    const maxLeto = Number(grafData?.maxLeto || 0);
    const leta = zgradiLeta(minLeto, maxLeto);

    const dpMapa = pripraviLetoMap(grafData?.delovnePostaje);
    const monitorjiMapa = pripraviLetoMap(grafData?.monitorji);
    const tiskalnikiMapa = pripraviLetoMap(grafData?.tiskalniki);
    const citalciMapa = pripraviLetoMap(grafData?.rocniCitalci);

    const dpVrednosti = leta.map(leto => dpMapa.get(leto) || 0);
    const monitorjiVrednosti = leta.map(leto => monitorjiMapa.get(leto) || 0);
    const tiskalnikiVrednosti = leta.map(leto => tiskalnikiMapa.get(leto) || 0);
    const citalciVrednosti = leta.map(leto => citalciMapa.get(leto) || 0);

    const grafElement = document.getElementById('nakupiPoLetihGraf');
    if (!grafElement) return;

    if (grafNakupiPoLetih) {
        grafNakupiPoLetih.destroy();
    }

    grafNakupiPoLetih = new Chart(grafElement, {
        type: 'bar',
        data: {
            labels: leta,
            datasets: [
                {
                    label: 'Delovne postaje',
                    data: dpVrednosti,
                    borderColor: '#3498DB',
                    backgroundColor: '#3498DB',
                    borderWidth: 1
                },
                {
                    label: 'Monitorji',
                    data: monitorjiVrednosti,
                    borderColor: '#2ECC71',
                    backgroundColor: '#2ECC71',
                    borderWidth: 1
                },
                {
                    label: 'Tiskalniki',
                    data: tiskalnikiVrednosti,
                    borderColor: '#E67E22',
                    backgroundColor: '#E67E22',
                    borderWidth: 1
                },
                {
                    label: 'Ročni čitalci',
                    data: citalciVrednosti,
                    borderColor: '#9B59B6',
                    backgroundColor: '#9B59B6',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 25
                    },
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const chart = legend.chart;
                        
                        if (activeDatasetNakupi === index) {
                            // If clicking the same dataset, show all
                            chart.data.datasets.forEach((dataset, i) => {
                                chart.getDatasetMeta(i).hidden = false;
                            });
                            activeDatasetNakupi = null;
                        } else {
                            // Hide all except the clicked one
                            chart.data.datasets.forEach((dataset, i) => {
                                chart.getDatasetMeta(i).hidden = i !== index;
                            });
                            activeDatasetNakupi = index;
                        }
                        
                        chart.update();
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Leto proizvodnje'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: 'Število naprav'
                    }
                }
            }
        }
    });
}

/**
 * Nariše ali osveži stolpični graf naprav po enotah.
 * Združi vse tipe naprav po oznaki enote v skupno mapo in pripravi nabore podatkov.
 * @param {object} grafData - Podatki za graf iz strežniškega odziva (/nadzornaPlosca/grafPoEnoti).
 */
function narisiGrafNapravePoEnoti(grafData) {
    const enoteMap = new Map();
    const deviceTypes = ['delovnePostaje', 'monitorji', 'tiskalniki', 'rocniCitalci'];
    
    // Prepare data for each device type
    deviceTypes.forEach(tipNaprave => {
        const podatki = grafData?.[tipNaprave] || [];
        podatki.forEach(vnos => {
            const enota = vnos.OznakaEnote || 'Neznana';
            if (!enoteMap.has(enota)) {
                enoteMap.set(enota, {
                    delovnePostaje: 0,
                    monitorji: 0,
                    tiskalniki: 0,
                    rocniCitalci: 0
                });
            }
            const trenutni = enoteMap.get(enota);
            trenutni[tipNaprave] = Number(vnos.Stevilo || 0);
        });
    });

    const enote = Array.from(enoteMap.keys()).sort();
    const dpVrednosti = enote.map(enota => enoteMap.get(enota).delovnePostaje);
    const monitorjiVrednosti = enote.map(enota => enoteMap.get(enota).monitorji);
    const tiskalnikiVrednosti = enote.map(enota => enoteMap.get(enota).tiskalniki);
    const citalciVrednosti = enote.map(enota => enoteMap.get(enota).rocniCitalci);

    const grafElement = document.getElementById('napraviPosluzbiGraf');
    if (!grafElement) return;

    if (grafNapravePoEnoti) {
        grafNapravePoEnoti.destroy();
    }

    grafNapravePoEnoti = new Chart(grafElement, {
        type: 'bar',
        data: {
            labels: enote,
            datasets: [
                {
                    label: 'Delovne postaje',
                    data: dpVrednosti,
                    backgroundColor: '#3498DB',
                    borderColor: '#3498DB',
                    borderWidth: 1
                },
                {
                    label: 'Monitorji',
                    data: monitorjiVrednosti,
                    backgroundColor: '#2ECC71',
                    borderColor: '#2ECC71',
                    borderWidth: 1
                },
                {
                    label: 'Tiskalniki',
                    data: tiskalnikiVrednosti,
                    backgroundColor: '#E67E22',
                    borderColor: '#E67E22',
                    borderWidth: 1
                },
                {
                    label: 'Ročni čitalci',
                    data: citalciVrednosti,
                    backgroundColor: '#9B59B6',
                    borderColor: '#9B59B6',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 25
                    },
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const chart = legend.chart;
                        
                        if (activeDatasetNaprave === index) {
                            // If clicking the same dataset, show all
                            chart.data.datasets.forEach((dataset, i) => {
                                chart.getDatasetMeta(i).hidden = false;
                            });
                            activeDatasetNaprave = null;
                        } else {
                            // Hide all except the clicked one
                            chart.data.datasets.forEach((dataset, i) => {
                                chart.getDatasetMeta(i).hidden = i !== index;
                            });
                            activeDatasetNaprave = index;
                        }
                        
                        chart.update();
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Enota'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: 'Število naprav'
                    }
                }
            }
        }
    });
}

/**
 * Nariše ali osveži stolpični graf naprav po službah.
 * Združi vse tipe naprav po oznaki službe v skupno mapo in pripravi nabore podatkov.
 * @param {object} grafData - Podatki za graf iz strežniškega odziva (/nadzornaPlosca/grafPoSluzbi).
 */
function narisiGrafNapravePoSluzbi(grafData) {
    const sluzbeMap = new Map();
    const deviceTypes = ['delovnePostaje', 'monitorji', 'tiskalniki', 'rocniCitalci'];

    deviceTypes.forEach(tipNaprave => {
        const podatki = grafData?.[tipNaprave] || [];
        podatki.forEach(vnos => {
            const sluzba = vnos.OznakaSluzbe || 'Neznana';
            if (!sluzbeMap.has(sluzba)) {
                sluzbeMap.set(sluzba, {
                    delovnePostaje: 0,
                    monitorji: 0,
                    tiskalniki: 0,
                    rocniCitalci: 0
                });
            }
            sluzbeMap.get(sluzba)[tipNaprave] = Number(vnos.Stevilo || 0);
        });
    });

    const sluzbe = Array.from(sluzbeMap.keys()).sort();
    const dpVrednosti = sluzbe.map(s => sluzbeMap.get(s).delovnePostaje);
    const monitorjiVrednosti = sluzbe.map(s => sluzbeMap.get(s).monitorji);
    const tiskalnikiVrednosti = sluzbe.map(s => sluzbeMap.get(s).tiskalniki);
    const citalciVrednosti = sluzbe.map(s => sluzbeMap.get(s).rocniCitalci);

    const grafElement = document.getElementById('napravePoSluzbahGraf');
    if (!grafElement) return;

    if (grafNapravePoSluzbi) {
        grafNapravePoSluzbi.destroy();
    }

    grafNapravePoSluzbi = new Chart(grafElement, {
        type: 'bar',
        data: {
            labels: sluzbe,
            datasets: [
                {
                    label: 'Delovne postaje',
                    data: dpVrednosti,
                    backgroundColor: '#3498DB',
                    borderColor: '#3498DB',
                    borderWidth: 1
                },
                {
                    label: 'Monitorji',
                    data: monitorjiVrednosti,
                    backgroundColor: '#2ECC71',
                    borderColor: '#2ECC71',
                    borderWidth: 1
                },
                {
                    label: 'Tiskalniki',
                    data: tiskalnikiVrednosti,
                    backgroundColor: '#E67E22',
                    borderColor: '#E67E22',
                    borderWidth: 1
                },
                {
                    label: 'Ročni čitalci',
                    data: citalciVrednosti,
                    backgroundColor: '#9B59B6',
                    borderColor: '#9B59B6',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 25
                    },
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const chart = legend.chart;

                        if (activeDatasetSluzbe === index) {
                            chart.data.datasets.forEach((dataset, i) => {
                                chart.getDatasetMeta(i).hidden = false;
                            });
                            activeDatasetSluzbe = null;
                        } else {
                            chart.data.datasets.forEach((dataset, i) => {
                                chart.getDatasetMeta(i).hidden = i !== index;
                            });
                            activeDatasetSluzbe = index;
                        }

                        chart.update();
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Služba'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: 'Število naprav'
                    }
                }
            }
        }
    });
}

/**
 * Nariše ali osveži stolpični graf naprav po nadstropjih.
 * Združi vse tipe naprav po oznaki nadstropja v skupno mapo in pripravi nabore podatkov.
 * @param {object} grafData - Podatki za graf iz strežniškega odziva (/nadzornaPlosca/grafPoNadstropju).
 */
function narisiGrafNapravePoNadstropjih(grafData) {
    const nadstropjaMap = new Map();
    const deviceTypes = ['delovnePostaje', 'monitorji', 'tiskalniki', 'rocniCitalci'];

    deviceTypes.forEach(tipNaprave => {
        const podatki = grafData?.[tipNaprave] || [];
        podatki.forEach(vnos => {
            const nadstropje = vnos.OznakaNadstropja || 'Neznano';
            if (!nadstropjaMap.has(nadstropje)) {
                nadstropjaMap.set(nadstropje, {
                    delovnePostaje: 0,
                    monitorji: 0,
                    tiskalniki: 0,
                    rocniCitalci: 0
                });
            }
            nadstropjaMap.get(nadstropje)[tipNaprave] = Number(vnos.Stevilo || 0);
        });
    });

    const nadstropja = Array.from(nadstropjaMap.keys()).sort((a, b) => a.localeCompare(b, 'sl'));
    const dpVrednosti = nadstropja.map(n => nadstropjaMap.get(n).delovnePostaje);
    const monitorjiVrednosti = nadstropja.map(n => nadstropjaMap.get(n).monitorji);
    const tiskalnikiVrednosti = nadstropja.map(n => nadstropjaMap.get(n).tiskalniki);
    const citalciVrednosti = nadstropja.map(n => nadstropjaMap.get(n).rocniCitalci);

    const grafElement = document.getElementById('napravePoNadstropjihGraf');
    if (!grafElement) return;

    if (grafNapravePoNadstropjih) {
        grafNapravePoNadstropjih.destroy();
    }

    grafNapravePoNadstropjih = new Chart(grafElement, {
        type: 'bar',
        data: {
            labels: nadstropja,
            datasets: [
                {
                    label: 'Delovne postaje',
                    data: dpVrednosti,
                    backgroundColor: '#3498DB',
                    borderColor: '#3498DB',
                    borderWidth: 1
                },
                {
                    label: 'Monitorji',
                    data: monitorjiVrednosti,
                    backgroundColor: '#2ECC71',
                    borderColor: '#2ECC71',
                    borderWidth: 1
                },
                {
                    label: 'Tiskalniki',
                    data: tiskalnikiVrednosti,
                    backgroundColor: '#E67E22',
                    borderColor: '#E67E22',
                    borderWidth: 1
                },
                {
                    label: 'Ročni čitalci',
                    data: citalciVrednosti,
                    backgroundColor: '#9B59B6',
                    borderColor: '#9B59B6',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 25
                    },
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const chart = legend.chart;

                        if (activeDatasetNadstropja === index) {
                            chart.data.datasets.forEach((dataset, i) => {
                                chart.getDatasetMeta(i).hidden = false;
                            });
                            activeDatasetNadstropja = null;
                        } else {
                            chart.data.datasets.forEach((dataset, i) => {
                                chart.getDatasetMeta(i).hidden = i !== index;
                            });
                            activeDatasetNadstropja = index;
                        }

                        chart.update();
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Nadstropje'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: 'Število naprav'
                    }
                }
            }
        }
    });
}

/**
 * Nariše ali osveži stolpični graf naprav po statusu razporeditve.
 * Prikaže tri status kategorije (Osebno, Skupno, Skladišče) z razčlenitvijo po tipu naprave.
 * @param {object} grafData - Podatki za graf iz strežniškega odziva (/nadzornaPlosca/equipmentByStatus).
 */
function narisiGrafNapravePoStatusu(grafData) {
    // Statusi: Osebno, Skupno, Skladišče
    const statusni = [
        { 
            key: 'osebno', 
            label: 'Osebno'
        },
        { 
            key: 'skupno', 
            label: 'Skupno'
        },
        { 
            key: 'skladisce', 
            label: 'Skladišče'
        }
    ];

    const labels = statusni.map(s => s.label);
    const dpVrednosti = statusni.map(s => grafData?.[s.key]?.delovnePostaje || 0);
    const monitorjiVrednosti = statusni.map(s => grafData?.[s.key]?.monitorji || 0);
    const tiskalnikiVrednosti = statusni.map(s => grafData?.[s.key]?.tiskalniki || 0);
    const citalciVrednosti = statusni.map(s => grafData?.[s.key]?.rocniCitalci || 0);

    const grafElement = document.getElementById('napravePoStatusuGraf');
    if (!grafElement) return;

    if (grafNapravePoStatusu) {
        grafNapravePoStatusu.destroy();
    }

    grafNapravePoStatusu = new Chart(grafElement, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Delovne postaje',
                    data: dpVrednosti,
                    backgroundColor: '#3498DB',
                    borderColor: '#3498DB',
                    borderWidth: 1
                },
                {
                    label: 'Monitorji',
                    data: monitorjiVrednosti,
                    backgroundColor: '#2ECC71',
                    borderColor: '#2ECC71',
                    borderWidth: 1
                },
                {
                    label: 'Tiskalniki',
                    data: tiskalnikiVrednosti,
                    backgroundColor: '#E67E22',
                    borderColor: '#E67E22',
                    borderWidth: 1
                },
                {
                    label: 'Ročni čitalci',
                    data: citalciVrednosti,
                    backgroundColor: '#9B59B6',
                    borderColor: '#9B59B6',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 25
                    },
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const chart = legend.chart;

                        if (activeDatasetStatusu === index) {
                            chart.data.datasets.forEach((dataset, i) => {
                                chart.getDatasetMeta(i).hidden = false;
                            });
                            activeDatasetStatusu = null;
                        } else {
                            chart.data.datasets.forEach((dataset, i) => {
                                chart.getDatasetMeta(i).hidden = i !== index;
                            });
                            activeDatasetStatusu = index;
                        }

                        chart.update();
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Status dodeljenosti'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: 'Število naprav'
                    }
                }
            }
        }
    });
}

/** Ali je graf po enotah že naložen (lazy-load ob prvem kliku zavihka). */
let enotaGrafNalozen = false;
/** Ali je graf po službah že naložen (lazy-load ob prvem kliku zavihka). */
let sluzbaGrafNalozen = false;
/** Ali je graf po nadstropjih že naložen (lazy-load ob prvem kliku zavihka). */
let nadstropjeGrafNalozen = false;
/** Ali je graf po statusu že naložen (lazy-load ob prvem kliku zavihka). */
let statusGrafNalozen = false;

/**
 * Naloži in nariše graf naprav po enotah (kliče /nadzornaPlosca/grafPoEnoti).
 * Kliče se ob prvem prikazu zavihka "Po enoti".
 */
async function naloziGrafPoEnoti() {
    if (enotaGrafNalozen) return;
    try {
        const response = await fetch('/nadzornaPlosca/grafPoEnoti');
        if (!response.ok) throw new Error('Napaka pri nalaganju grafa po enotah');
        const data = await response.json();
        narisiGrafNapravePoEnoti(data);
        enotaGrafNalozen = true;
    } catch (err) {
        console.error('Napaka pri nalaganju grafa po enotah:', err);
    }
}

/**
 * Naloži in nariše graf naprav po službah (kliče /nadzornaPlosca/grafPoSluzbi).
 * Kliče se ob prvem prikazu zavihka "Po službi".
 */
async function naloziGrafPoSluzbi() {
    if (sluzbaGrafNalozen) return;
    try {
        const response = await fetch('/nadzornaPlosca/grafPoSluzbi');
        if (!response.ok) throw new Error('Napaka pri nalaganju grafa po službah');
        const data = await response.json();
        narisiGrafNapravePoSluzbi(data);
        sluzbaGrafNalozen = true;
    } catch (err) {
        console.error('Napaka pri nalaganju grafa po službah:', err);
    }
}

/**
 * Naloži in nariše graf naprav po nadstropjih (kliče /nadzornaPlosca/grafPoNadstropju).
 * Kliče se ob prvem prikazu zavihka "Po nadstropju".
 */
async function naloziGrafPoNadstropju() {
    if (nadstropjeGrafNalozen) return;
    try {
        const response = await fetch('/nadzornaPlosca/grafPoNadstropju');
        if (!response.ok) throw new Error('Napaka pri nalaganju grafa po nadstropjih');
        const data = await response.json();
        narisiGrafNapravePoNadstropjih(data);
        nadstropjeGrafNalozen = true;
    } catch (err) {
        console.error('Napaka pri nalaganju grafa po nadstropjih:', err);
    }
}

/**
 * Naloži in nariše graf naprav po statusu (kliče /nadzornaPlosca/equipmentByStatus).
 * Kliče se ob prvem prikazu zavihka "Po statusu".
 */
async function naloziGrafPoStatusu() {
    if (statusGrafNalozen) return;
    try {
        const response = await fetch('/nadzornaPlosca/equipmentByStatus');
        if (!response.ok) throw new Error('Napaka pri nalaganju grafa po statusu');
        const data = await response.json();
        narisiGrafNapravePoStatusu(data);
        statusGrafNalozen = true;
    } catch (err) {
        console.error('Napaka pri nalaganju grafa po statusu:', err);
    }
}

/**
 * Posodobi samo kartice s številom starih naprav (kliče /nadzornaPlosca/starost).
 * in jih prikaže v karticah z oznako "Starejše od X let".
 * @param {number} [starost=0] - Starostni prag v letih.
 */
async function fetchAndUpdateNumbers(starost = 0) {
    const response = await fetch(`/nadzornaPlosca/starost?starost=${starost}`);
    if (!response.ok) {
        throw new Error('Napaka pri pridobivanju podatkov o starosti naprav');
    }

    const staro = await response.json();

    setText('staroDP', staro.delovnePostaje);
    setText('staroMonitorji', staro.monitorji);
    setText('staroTiskalniki', staro.tiskalniki);
    setText('staroCitalci', staro.rocniCitalci);

    // Calculate and display percentages
    const dpPercent = staro.vsidelovnePostaje > 0 ? ((staro.delovnePostaje / staro.vsidelovnePostaje) * 100).toFixed(1) : 0;
    const monPercent = staro.vsimonitorji > 0 ? ((staro.monitorji / staro.vsimonitorji) * 100).toFixed(1) : 0;
    const tiskPercent = staro.vsitiskalniki > 0 ? ((staro.tiskalniki / staro.vsitiskalniki) * 100).toFixed(1) : 0;
    const citalPercent = staro.vsirocniCitalci > 0 ? ((staro.rocniCitalci / staro.vsirocniCitalci) * 100).toFixed(1) : 0;

    const dpPercentEl = document.getElementById('staroDP-percent');
    const monPercentEl = document.getElementById('staroMonitorji-percent');
    const tiskPercentEl = document.getElementById('staroTiskalniki-percent');
    const citalPercentEl = document.getElementById('staroCitalci-percent');

    if (dpPercentEl) dpPercentEl.textContent = `${dpPercent}%`;
    if (monPercentEl) monPercentEl.textContent = `${monPercent}%`;
    if (tiskPercentEl) tiskPercentEl.textContent = `${tiskPercent}%`;
    if (citalPercentEl) citalPercentEl.textContent = `${citalPercent}%`;
}

async function fetchAndUpdateLokacijaNumbers(oznakaLokacije) {
    if (!oznakaLokacije) return;

    const response = await fetch(`/nadzornaPlosca/poLokaciji?oznakaLokacije=${encodeURIComponent(oznakaLokacije)}`);
    if (!response.ok) {
        throw new Error('Napaka pri pridobivanju podatkov po lokaciji');
    }

    const poLokaciji = await response.json();
    setText('lokacijaDP', poLokaciji.delovnePostaje);
    setText('lokacijaMonitorji', poLokaciji.monitorji);
    setText('lokacijaTiskalniki', poLokaciji.tiskalniki);
    setText('lokacijaCitalci', poLokaciji.rocniCitalci);
}

function napolniLokacijeDropdown(lokacije) {
    const lokacijaSelect = document.getElementById('lokacijaDashboardSelect');
    if (!lokacijaSelect) return '';

    const lokacijeSeznam = Array.isArray(lokacije) ? lokacije : [];
    lokacijaNadstropjeMap.clear();
    lokacijeSeznam.forEach(lok => {
        lokacijaNadstropjeMap.set(lok.oznakaLokacije, lok.oznakaNadstropja || '-');
    });

    if (lokacijeSeznam.length === 0) {
        lokacijaSelect.innerHTML = '<option value="">Ni lokacij</option>';
        posodobiLokacijaNadstropje('');
        return '';
    }

    lokacijaSelect.innerHTML = lokacijeSeznam
        .map(lok => `<option value="${lok.oznakaLokacije}">${lok.oznakaLokacije} - ${lok.nazivLokacije}${lok.oznakaNadstropja ? ', ' + lok.oznakaNadstropja : ''}</option>`)
        .join('');

    const shranjenaLokacija = preberiLokacijoShranjeno();
    const obstajaShranjena = lokacijeSeznam.some(lok => lok.oznakaLokacije === shranjenaLokacija);
    const zacetnaLokacija = obstajaShranjena ? shranjenaLokacija : lokacijeSeznam[0].oznakaLokacije;

    lokacijaSelect.value = zacetnaLokacija;
    localStorage.setItem(LOKACIJA_STORAGE_KEY, zacetnaLokacija);
    posodobiLokacijaNadstropje(zacetnaLokacija);
    return zacetnaLokacija;
}

function posodobiLokacijaNadstropje(oznakaLokacije) {
    const nadstropjeEl = document.getElementById('lokacijaNadstropje');
    if (!nadstropjeEl) return;

    const nadstropje = lokacijaNadstropjeMap.get(oznakaLokacije) || '-';
    nadstropjeEl.textContent = `${nadstropje}`;
}

/**
 * Inicializira celotno nadzorno ploščo: naloži KPI števce, starost in graf po letih
 * vzporedno. Grafa po enotah in po službah se naložita lazy ob prvem kliku zavihka.
 * @param {number} [starost=0] - Začetni starostni prag za filter.
 */
async function initDashboard(starost = 0) {
    const [kpiRes, starostRes, nerazRes, skupnaRes, lokacijeRes, grafRes] = await Promise.all([
        fetch('/nadzornaPlosca/kpi'),
        fetch(`/nadzornaPlosca/starost?starost=${starost}`),
        fetch('/nadzornaPlosca/nerazporejene'),
        fetch('/nadzornaPlosca/skupnaRaba'),
        fetch('/nadzornaPlosca/lokacije'),
        fetch('/nadzornaPlosca/grafPoLetih')
    ]);

    if (!kpiRes.ok || !starostRes.ok || !nerazRes.ok || !skupnaRes.ok || !lokacijeRes.ok || !grafRes.ok) {
        throw new Error('Napaka pri pridobivanju podatkov nadzorne plošče');
    }

    const [kpi, staro, neraz, skupna, lokacije, graf] = await Promise.all([
        kpiRes.json(),
        starostRes.json(),
        nerazRes.json(),
        skupnaRes.json(),
        lokacijeRes.json(),
        grafRes.json()
    ]);

    setText('kpiDP', kpi.delovnePostaje);
    setText('kpiMonitorji', kpi.monitorji);
    setText('kpiTiskalniki', kpi.tiskalniki);
    setText('kpiCitalci', kpi.rocniCitalci);
    setText('kpiVM', kpi.virtualniStrezniki);

    setText('nerazDP', neraz.delovnePostaje);
    setText('nerazMonitorji', neraz.monitorji);
    setText('nerazTiskalniki', neraz.tiskalniki);
    setText('nerazCitalci', neraz.rocniCitalci);

    setText('skupnaDP', skupna.delovnePostaje);
    setText('skupnaMonitorji', skupna.monitorji);
    setText('skupnaTiskalniki', skupna.tiskalniki);
    setText('skupnaCitalci', skupna.rocniCitalci);

    setText('staroDP', staro.delovnePostaje);
    setText('staroMonitorji', staro.monitorji);
    setText('staroTiskalniki', staro.tiskalniki);
    setText('staroCitalci', staro.rocniCitalci);

    // Calculate and display percentages for staro (old devices)
    const dpPercent = staro.vsidelovnePostaje > 0 ? ((staro.delovnePostaje / staro.vsidelovnePostaje) * 100).toFixed(1) : 0;
    const monPercent = staro.vsimonitorji > 0 ? ((staro.monitorji / staro.vsimonitorji) * 100).toFixed(1) : 0;
    const tiskPercent = staro.vsitiskalniki > 0 ? ((staro.tiskalniki / staro.vsitiskalniki) * 100).toFixed(1) : 0;
    const citalPercent = staro.vsirocniCitalci > 0 ? ((staro.rocniCitalci / staro.vsirocniCitalci) * 100).toFixed(1) : 0;

    const dpPercentEl = document.getElementById('staroDP-percent');
    const monPercentEl = document.getElementById('staroMonitorji-percent');
    const tiskPercentEl = document.getElementById('staroTiskalniki-percent');
    const citalPercentEl = document.getElementById('staroCitalci-percent');

    if (dpPercentEl) dpPercentEl.textContent = `${dpPercent}%`;
    if (monPercentEl) monPercentEl.textContent = `${monPercent}%`;
    if (tiskPercentEl) tiskPercentEl.textContent = `${tiskPercent}%`;
    if (citalPercentEl) citalPercentEl.textContent = `${citalPercent}%`;

    const zacetnaLokacija = napolniLokacijeDropdown(lokacije);
    await fetchAndUpdateLokacijaNumbers(zacetnaLokacija);

    narisiGrafPoLetih(graf);
}

// Inicializacija nadzorne plošče ob nalaganju DOM
window.addEventListener("DOMContentLoaded", () => {
    const starostInput = document.getElementById('starostInput');
    const zacetnaStarost = preberiStarostShranjeno();
    if (starostInput) {
        starostInput.value = zacetnaStarost;
        starostInput.addEventListener('change', async () => {
            const parsedStarost = parseInt(starostInput.value, 10);
            const starost = Number.isFinite(parsedStarost) ? parsedStarost : 0;
            localStorage.setItem(STAROST_STORAGE_KEY, String(starost));
            await fetchAndUpdateNumbers(starost);
        });
    }

    const viewNerazDP = document.getElementById('viewNerazDP');
    const viewNerazMonitorji = document.getElementById('viewNerazMonitorji');
    const viewNerazTiskalniki = document.getElementById('viewNerazTiskalniki');
    const viewNerazCitalci = document.getElementById('viewNerazCitalci');
    const viewSkupnaDP = document.getElementById('viewSkupnaDP');
    const viewSkupnaMonitorji = document.getElementById('viewSkupnaMonitorji');
    const viewSkupnaTiskalniki = document.getElementById('viewSkupnaTiskalniki');
    const viewSkupnaCitalci = document.getElementById('viewSkupnaCitalci');
    const viewLokacijaDP = document.getElementById('viewLokacijaDP');
    const viewLokacijaMonitorji = document.getElementById('viewLokacijaMonitorji');
    const viewLokacijaTiskalniki = document.getElementById('viewLokacijaTiskalniki');
    const viewLokacijaCitalci = document.getElementById('viewLokacijaCitalci');
    const viewStaroDP = document.getElementById('viewStaroDP');
    const viewStaroMonitorji = document.getElementById('viewStaroMonitorji');
    const viewStaroTiskalniki = document.getElementById('viewStaroTiskalniki');
    const viewStaroCitalci = document.getElementById('viewStaroCitalci');
    const lokacijaDashboardSelect = document.getElementById('lokacijaDashboardSelect');

    if (viewNerazDP) {
        viewNerazDP.addEventListener('click', () => odpriSkladisceNapraveModal('delovnePostaje'));
    }
    if (viewNerazMonitorji) {
        viewNerazMonitorji.addEventListener('click', () => odpriSkladisceNapraveModal('monitorji'));
    }
    if (viewNerazTiskalniki) {
        viewNerazTiskalniki.addEventListener('click', () => odpriSkladisceNapraveModal('tiskalniki'));
    }
    if (viewNerazCitalci) {
        viewNerazCitalci.addEventListener('click', () => odpriSkladisceNapraveModal('rocniCitalci'));
    }
    if (viewSkupnaDP) {
        viewSkupnaDP.addEventListener('click', () => odpriSkupnaRabaNapraveModal('delovnePostaje'));
    }
    if (viewSkupnaMonitorji) {
        viewSkupnaMonitorji.addEventListener('click', () => odpriSkupnaRabaNapraveModal('monitorji'));
    }
    if (viewSkupnaTiskalniki) {
        viewSkupnaTiskalniki.addEventListener('click', () => odpriSkupnaRabaNapraveModal('tiskalniki'));
    }
    if (viewSkupnaCitalci) {
        viewSkupnaCitalci.addEventListener('click', () => odpriSkupnaRabaNapraveModal('rocniCitalci'));
    }
    if (viewLokacijaDP) {
        viewLokacijaDP.addEventListener('click', () => odpriLokacijaNapraveModal('delovnePostaje'));
    }
    if (viewLokacijaMonitorji) {
        viewLokacijaMonitorji.addEventListener('click', () => odpriLokacijaNapraveModal('monitorji'));
    }
    if (viewLokacijaTiskalniki) {
        viewLokacijaTiskalniki.addEventListener('click', () => odpriLokacijaNapraveModal('tiskalniki'));
    }
    if (viewLokacijaCitalci) {
        viewLokacijaCitalci.addEventListener('click', () => odpriLokacijaNapraveModal('rocniCitalci'));
    }
    if (viewStaroDP) {
        viewStaroDP.addEventListener('click', () => odpriStarejseNapraveModal('delovnePostaje'));
    }
    if (viewStaroMonitorji) {
        viewStaroMonitorji.addEventListener('click', () => odpriStarejseNapraveModal('monitorji'));
    }
    if (viewStaroTiskalniki) {
        viewStaroTiskalniki.addEventListener('click', () => odpriStarejseNapraveModal('tiskalniki'));
    }
    if (viewStaroCitalci) {
        viewStaroCitalci.addEventListener('click', () => odpriStarejseNapraveModal('rocniCitalci'));
    }
    if (lokacijaDashboardSelect) {
        lokacijaDashboardSelect.addEventListener('change', async () => {
            const oznakaLokacije = lokacijaDashboardSelect.value;
            localStorage.setItem(LOKACIJA_STORAGE_KEY, oznakaLokacije);
            posodobiLokacijaNadstropje(oznakaLokacije);
            await fetchAndUpdateLokacijaNumbers(oznakaLokacije);
        });
    }

    uporabnikPodatki()
        .then(data => {
            updateUserDisplay(data);
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

            return initDashboard(zacetnaStarost);
        })
        .catch(err => {
            console.error('Error loading dashboard:', err);
        });

    // Handle chart resizing when tabs are switched
    const tabLetoBtn = document.getElementById('tab-leto');
    const tabEnotaBtn = document.getElementById('tab-enota');
    const tabSluzbaBtn = document.getElementById('tab-sluzba');
    const tabNadstropjeBtn = document.getElementById('tab-nadstropje');
    const tabStatusBtn = document.getElementById('tab-status');
    
    if (tabLetoBtn) {
        tabLetoBtn.addEventListener('shown.bs.tab', () => {
            if (grafNakupiPoLetih) grafNakupiPoLetih.resize();
        });
    }
    
    if (tabEnotaBtn) {
        tabEnotaBtn.addEventListener('shown.bs.tab', async () => {
            await naloziGrafPoEnoti();
            if (grafNapravePoEnoti) grafNapravePoEnoti.resize();
        });
    }

    if (tabSluzbaBtn) {
        tabSluzbaBtn.addEventListener('shown.bs.tab', async () => {
            await naloziGrafPoSluzbi();
            if (grafNapravePoSluzbi) grafNapravePoSluzbi.resize();
        });
    }

    if (tabNadstropjeBtn) {
        tabNadstropjeBtn.addEventListener('shown.bs.tab', async () => {
            await naloziGrafPoNadstropju();
            if (grafNapravePoNadstropjih) grafNapravePoNadstropjih.resize();
        });
    }

    if (tabStatusBtn) {
        tabStatusBtn.addEventListener('shown.bs.tab', async () => {
            await naloziGrafPoStatusu();
            if (grafNapravePoStatusu) grafNapravePoStatusu.resize();
        });
    }
});
