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
/** Indeks aktivnega nabora podatkov v grafu nakupov (za toggle legend). */
let activeDatasetNakupi = null;
/** Indeks aktivnega nabora podatkov v grafu naprav po enotah (za toggle legend). */
let activeDatasetNaprave = null;
/** Indeks aktivnega nabora podatkov v grafu naprav po službah (za toggle legend). */
let activeDatasetSluzbe = null;
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

/** Ali je graf po enotah že naložen (lazy-load ob prvem kliku zavihka). */
let enotaGrafNalozen = false;
/** Ali je graf po službah že naložen (lazy-load ob prvem kliku zavihka). */
let sluzbaGrafNalozen = false;

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
}

/**
 * Inicializira celotno nadzorno ploščo: naloži KPI števce, starost in graf po letih
 * vzporedno. Grafa po enotah in po službah se naložita lazy ob prvem kliku zavihka.
 * @param {number} [starost=0] - Začetni starostni prag za filter.
 */
async function initDashboard(starost = 0) {
    const [kpiRes, starostRes, nerazRes, grafRes] = await Promise.all([
        fetch('/nadzornaPlosca/kpi'),
        fetch(`/nadzornaPlosca/starost?starost=${starost}`),
        fetch('/nadzornaPlosca/nerazporejene'),
        fetch('/nadzornaPlosca/grafPoLetih')
    ]);

    if (!kpiRes.ok || !starostRes.ok || !nerazRes.ok || !grafRes.ok) {
        throw new Error('Napaka pri pridobivanju podatkov nadzorne plošče');
    }

    const [kpi, staro, neraz, graf] = await Promise.all([
        kpiRes.json(),
        starostRes.json(),
        nerazRes.json(),
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

    setText('staroDP', staro.delovnePostaje);
    setText('staroMonitorji', staro.monitorji);
    setText('staroTiskalniki', staro.tiskalniki);
    setText('staroCitalci', staro.rocniCitalci);

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
    const tabSluzbaBtn = document.getElementById('tab-sluzba');
    
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
});
