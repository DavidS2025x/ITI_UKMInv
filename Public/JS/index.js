/// <reference path="./main.js" />

/**
 * Nadzorna plošča (index) – inicializira KPI števce, grafe po letih in po enotah,
 * ter filter za starost naprav z ohranjevanjem vrednosti v localStorage.
 */

/** Referenca na instanco grafa nakupov po letih (Chart.js). */
let grafNakupiPoLetih = null;
/** Referenca na instanco grafa naprav po enotah (Chart.js). */
let grafNapravePoSluzbi = null;
/** Ključ za shranjevanje filtra starosti naprav v localStorage. */
const STAROST_STORAGE_KEY = 'starostNaprave';

/**
 * Prebere shranjeno vrednost filtra starosti iz localStorage.
 * @returns {number} Shranjena vrednost starosti ali 0, če vrednost ni nastavljena.
 */
function preberiStarostShranjeno() {
    const saved = localStorage.getItem(STAROST_STORAGE_KEY);
    const parsed = parseInt(saved, 10);
    return Number.isFinite(parsed) ? parsed : 0;
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
 * @param {object} grafData - Podatki za graf iz strežniškega odziva (/nadzornaPloscaPodatki).
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
 * @param {object} grafData - Podatki za graf iz strežniškega odziva (/nadzornaPloscaPodatki).
 */
function narisiGrafNapravePoSluzbi(grafData) {
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

    if (grafNapravePoSluzbi) {
        grafNapravePoSluzbi.destroy();
    }

    grafNapravePoSluzbi = new Chart(grafElement, {
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
 * Pridobi posodobljene KPI vrednosti za naprave, starejše od podanega praga,
 * in jih prikaže v karticah z oznako "Starejše od X let".
 * @param {number} [starost=0] - Starostni prag v letih.
 */
async function fetchAndUpdateNumbers(starost = 0) {
    const response = await fetch(`/nadzornaPloscaPodatki?starost=${starost}`);
    if (!response.ok) {
        throw new Error('Napaka pri pridobivanju podatkov nadzorne plošče');
    }

    const data = await response.json();
    const staro = data.starejseOd5Let || {};

    setText('staroDP', staro.delovnePostaje);
    setText('staroMonitorji', staro.monitorji);
    setText('staroTiskalniki', staro.tiskalniki);
    setText('staroCitalci', staro.rocniCitalci);
}

/**
 * Inicializira celotno nadzorno ploščo: naloži KPI števce, filtrira po starosti
 * in nariše oba grafa. Pokliče se ob nalaganju strani.
 * @param {number} [starost=0] - Začetni starostni prag za filter.
 */
async function initDashboard(starost = 0) {
    const response = await fetch(`/nadzornaPloscaPodatki?starost=${starost}`);
    if (!response.ok) {
        throw new Error('Napaka pri pridobivanju podatkov nadzorne plošče');
    }

    const data = await response.json();
    const kpi = data.kpi || {};
    const staro = data.starejseOd5Let || {};

    setText('kpiDP', kpi.delovnePostaje);
    setText('kpiMonitorji', kpi.monitorji);
    setText('kpiTiskalniki', kpi.tiskalniki);
    setText('kpiCitalci', kpi.rocniCitalci);
    setText('kpiVM', kpi.virtualniStrezniki);

    setText('staroDP', staro.delovnePostaje);
    setText('staroMonitorji', staro.monitorji);
    setText('staroTiskalniki', staro.tiskalniki);
    setText('staroCitalci', staro.rocniCitalci);

    narisiGrafPoLetih(data.graf);
    narisiGrafNapravePoSluzbi(data.napravePoSluzbi);
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

    uporabnikPodatki()
        .then(data => {
            document.getElementById('username').textContent = data.Ime + ' ' + data.Priimek;
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
    
    if (tabLetoBtn) {
        tabLetoBtn.addEventListener('shown.bs.tab', () => {
            if (grafNakupiPoLetih) grafNakupiPoLetih.resize();
        });
    }
    
    if (tabEnotaBtn) {
        tabEnotaBtn.addEventListener('shown.bs.tab', () => {
            if (grafNapravePoSluzbi) grafNapravePoSluzbi.resize();
        });
    }
});
