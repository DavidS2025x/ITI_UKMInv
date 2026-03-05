/// <reference path="./main.js" />

window.disableAddButton = true;

const AUDIT_OLD_ROW_COLUMN = 'Stari zapis';
const AUDIT_NEW_ROW_COLUMN = 'Novi zapis';

function parseAuditJson(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'object') return value;

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toDisplayString(value) {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
}

function formatCellHtml(value) {
    return `<pre class="mb-0" style="white-space: pre-wrap; word-break: break-word;">${escapeHtml(toDisplayString(value))}</pre>`;
}

function renderObjectDiff(oldObject, newObject) {
    const oldKeys = Object.keys(oldObject || {});
    const newKeys = Object.keys(newObject || {});
    const allKeys = Array.from(new Set([...oldKeys, ...newKeys])).sort((a, b) => a.localeCompare(b, 'sl'));

    if (!allKeys.length) {
        return {
            oldHtml: '<div class="text-muted">Ni podatkov</div>',
            newHtml: '<div class="text-muted">Ni podatkov</div>'
        };
    }

    const oldRows = [];
    const newRows = [];

    allKeys.forEach(key => {
        const hasOld = Object.prototype.hasOwnProperty.call(oldObject || {}, key);
        const hasNew = Object.prototype.hasOwnProperty.call(newObject || {}, key);
        const oldValue = hasOld ? oldObject[key] : undefined;
        const newValue = hasNew ? newObject[key] : undefined;

        const status = JSON.stringify(oldValue) !== JSON.stringify(newValue) ? 'changed' : 'same';

        const statusMap = {
            same: { oldClass: 'border-secondary-subtle', newClass: 'border-secondary-subtle', oldBadge: 'Nespremenjeno', newBadge: 'Nespremenjeno', badgeClass: 'text-bg-secondary' },
            changed: { oldClass: 'border-warning-subtle bg-warning-subtle', newClass: 'border-warning-subtle bg-warning-subtle', oldBadge: 'Spremenjeno', newBadge: 'Spremenjeno', badgeClass: 'text-bg-warning' }
        };

        const style = statusMap[status];
        const keyHtml = `<div class="fw-semibold mb-1">${escapeHtml(key)}</div>`;

        oldRows.push(`
            <div class="border rounded p-2 mb-2 ${style.oldClass}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    ${keyHtml}
                    <span class="badge ${style.badgeClass}">${style.oldBadge}</span>
                </div>
                ${hasOld ? formatCellHtml(oldValue) : '<div class="text-muted">—</div>'}
            </div>
        `);

        newRows.push(`
            <div class="border rounded p-2 mb-2 ${style.newClass}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    ${keyHtml}
                    <span class="badge ${style.badgeClass}">${style.newBadge}</span>
                </div>
                ${hasNew ? formatCellHtml(newValue) : '<div class="text-muted">—</div>'}
            </div>
        `);
    });

    return {
        oldHtml: oldRows.join(''),
        newHtml: newRows.join('')
    };
}

function showAuditJsonModal(oldRowValue, newRowValue, actionValue) {
    const oldRowElement = document.getElementById('auditOldRowJson');
    const newRowElement = document.getElementById('auditNewRowJson');
    const actionBadge = document.getElementById('auditActionBadge');
    const oldParsed = parseAuditJson(oldRowValue);
    const newParsed = parseAuditJson(newRowValue);

    let oldHtml;
    let newHtml;

    if (isPlainObject(oldParsed) || isPlainObject(newParsed)) {
        const diff = renderObjectDiff(
            isPlainObject(oldParsed) ? oldParsed : {},
            isPlainObject(newParsed) ? newParsed : {}
        );
        oldHtml = diff.oldHtml;
        newHtml = diff.newHtml;
    } else {
        const sameValue = JSON.stringify(oldParsed) === JSON.stringify(newParsed);
        const oldContainerClass = sameValue ? 'border-secondary-subtle' : 'border-warning-subtle bg-warning-subtle';
        const newContainerClass = sameValue ? 'border-secondary-subtle' : 'border-warning-subtle bg-warning-subtle';
        oldHtml = `<div class="border rounded p-2 ${oldContainerClass}">${formatCellHtml(oldParsed)}</div>`;
        newHtml = `<div class="border rounded p-2 ${newContainerClass}">${formatCellHtml(newParsed)}</div>`;
    }

    if (oldRowElement) {
        oldRowElement.innerHTML = oldHtml;
    }

    if (newRowElement) {
        newRowElement.innerHTML = newHtml;
    }

    if (actionBadge) {
        actionBadge.textContent = `Dejanje: ${actionValue || '—'}`;
    }

    bootstrap.Modal.getOrCreateInstance('#auditJsonModal').show();
}

function tabelaAudit(url, title, pagLimit, sortOrder = 'desc') {
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
            const visibleColumns = datacolumns.filter(col => col !== AUDIT_OLD_ROW_COLUMN && col !== AUDIT_NEW_ROW_COLUMN);

            const thead = document.querySelector('#datatbl thead tr');
            thead.innerHTML = '';

            visibleColumns.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col;
                thead.appendChild(th);
            });

            const actionHeader = document.createElement('th');
            actionHeader.textContent = 'Podrobnosti';
            thead.appendChild(actionHeader);

            thead.querySelectorAll('th').forEach(th => {
                th.style.whiteSpace = 'nowrap';
            });

            const tbody = document.querySelector('#datatbl tbody');
            tbody.innerHTML = '';

            const fragment = document.createDocumentFragment();
            data.forEach(row => {
                const tr = document.createElement('tr');

                visibleColumns.forEach(col => {
                    const td = document.createElement('td');
                    applyCellFormatting(td, row[col], col);
                    tr.appendChild(td);
                });

                const actionCell = document.createElement('td');
                actionCell.className = 'd-flex justify-content-center align-items-center gap-1';

                const detailsBtn = document.createElement('button');
                detailsBtn.className = 'view-btn';
                detailsBtn.title = 'Prikaži JSON podrobnosti';
                detailsBtn.innerHTML = '<i class="bi bi-file-earmark-code" style="font-size: 1rem; color: #0d6efd;"></i>';
                detailsBtn.style.background = 'none';
                detailsBtn.style.border = 'none';
                detailsBtn.style.padding = '0.25rem';
                detailsBtn.style.cursor = 'pointer';
                detailsBtn.style.display = 'flex';
                detailsBtn.style.alignItems = 'center';
                detailsBtn.style.transition = 'color 0.2s';
                detailsBtn.onmouseover = () => detailsBtn.querySelector('i').style.color = '#0b5ed7';
                detailsBtn.onmouseout = () => detailsBtn.querySelector('i').style.color = '#0d6efd';
                detailsBtn.onclick = () => showAuditJsonModal(row[AUDIT_OLD_ROW_COLUMN], row[AUDIT_NEW_ROW_COLUMN], row['Dejanje']);
                actionCell.appendChild(detailsBtn);

                tr.appendChild(actionCell);
                fragment.appendChild(tr);
            });
            tbody.appendChild(fragment);

            window.currentDataTable = $('#datatbl').DataTable({
                pageLength: limit,
                paging: true,
                searching: true,
                ordering: true,
                order: [[0, sortOrder]],
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

window.addEventListener("DOMContentLoaded", () => {
    uporabnikPodatki()
        .then(data => {
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
        }).catch(err => {
            console.error('Error loading user data:', err);
        });
        tabelaAudit('/auditPodatki', 'Revizijska sled', null, 'desc');
    });
