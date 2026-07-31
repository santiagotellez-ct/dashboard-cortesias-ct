const PALETTE = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5', '--series-6', '--series-7', '--series-8'];
const AUTO_REFRESH_MS = 30_000;

const els = {
  statusBadge: document.getElementById('statusBadge'),
  refreshButton: document.getElementById('refreshButton'),
  errorBanner: document.getElementById('errorBanner'),
  errorMessage: document.getElementById('errorMessage'),
  retryButton: document.getElementById('retryButton'),
  totalCount: document.getElementById('totalCount'),
  roleChart: document.getElementById('roleChart'),
  searchInput: document.getElementById('searchInput'),
  roleFilter: document.getElementById('roleFilter'),
  exportButton: document.getElementById('exportButton'),
  resultCount: document.getElementById('resultCount'),
  tableBody: document.getElementById('tableBody')
};

let records = [];
let roleColorMap = {};

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function buildRoleColorMap(allRecords) {
  const roles = [...new Set(allRecords.map((r) => r.role || 'Sin rol'))].sort((a, b) => a.localeCompare(b));
  const map = {};
  roles.forEach((role, index) => {
    map[role] = index < PALETTE.length ? `var(${PALETTE[index]})` : 'var(--series-other)';
  });
  return map;
}

function renderRoleChart(allRecords) {
  const counts = {};
  allRecords.forEach((r) => {
    const role = r.role || 'Sin rol';
    counts[role] = (counts[role] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted.length ? sorted[0][1] : 1;

  els.roleChart.innerHTML = sorted
    .map(([role, count]) => {
      const pct = Math.round((count / allRecords.length) * 100);
      const width = Math.max((count / max) * 100, 2);
      const color = roleColorMap[role] || 'var(--series-other)';
      return `
        <div class="role-row">
          <span class="role-name" title="${role}">${role}</span>
          <div class="role-track"><div class="role-fill" style="width:${width}%;background:${color}"></div></div>
          <span class="role-value">${count} · ${pct}%</span>
        </div>
      `;
    })
    .join('');
}

function populateRoleFilter(allRecords) {
  const roles = [...new Set(allRecords.map((r) => r.role || 'Sin rol'))].sort((a, b) => a.localeCompare(b));
  const current = els.roleFilter.value;
  els.roleFilter.innerHTML =
    '<option value="">Todos los roles</option>' + roles.map((r) => `<option value="${r}">${r}</option>`).join('');
  if (roles.includes(current)) els.roleFilter.value = current;
}

function getFiltered() {
  const query = normalizeText(els.searchInput.value);
  const role = els.roleFilter.value;

  return records.filter((r) => {
    if (role && (r.role || 'Sin rol') !== role) return false;
    if (query) {
      const haystack = [r.fullName, r.company, r.email, r.identification, r.barcode]
        .map(normalizeText)
        .join(' ');
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function render() {
  const filtered = getFiltered();

  els.resultCount.textContent = `${filtered.length} de ${records.length} registros`;

  if (!filtered.length) {
    els.tableBody.innerHTML = '<tr><td colspan="5" class="empty">No hay registros para mostrar con ese filtro.</td></tr>';
    return;
  }

  els.tableBody.innerHTML = filtered
    .map((record) => {
      const roleColor = roleColorMap[record.role || 'Sin rol'] || 'var(--series-other)';
      const location = [record.fr_field2, record.fr_field1].filter(Boolean).join(', ') || '—';

      return `
        <tr>
          <td>
            <strong>${record.fullName || '—'}</strong><br />
            <small>${record.identification || '—'}</small>
          </td>
          <td><span class="role-badge" style="border-color:${roleColor};color:${roleColor}">${record.role || '—'}</span></td>
          <td>${record.company || '—'}<br /><small>${record.fr_field7 || ''}</small></td>
          <td>${location}</td>
          <td>${record.email || '—'}</td>
        </tr>
      `;
    })
    .join('');
}

function setStatus(state, label) {
  els.statusBadge.dataset.state = state;
  els.statusBadge.textContent = label;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function loadData(forceRefresh) {
  try {
    const response = await fetch(`/api/records${forceRefresh ? '?refresh=true' : ''}`);
    const payload = await response.json();

    if (!payload.success) {
      throw new Error(payload.message || 'No se pudo cargar la información');
    }

    records = payload.records;
    els.totalCount.textContent = records.length;
    roleColorMap = buildRoleColorMap(records);
    populateRoleFilter(records);
    renderRoleChart(records);
    render();

    els.errorBanner.classList.add('hidden');

    if (payload.stale) {
      setStatus('stale', `Datos en caché · ${formatTime(payload.fetchedAt)}`);
    } else {
      setStatus('live', `Actualizado ${formatTime(payload.fetchedAt)}`);
    }
  } catch (error) {
    setStatus('error', 'Error al cargar');
    els.errorMessage.textContent = error.message;
    els.errorBanner.classList.remove('hidden');
  }
}

function exportCsv() {
  const filtered = getFiltered();
  const headers = ['Nombre', 'Identificación', 'Rol', 'Empresa', 'Cargo', 'País', 'Ciudad', 'Correo', 'Teléfono', 'Barcode'];
  const rows = filtered.map((r) => [
    r.fullName, r.identification, r.role, r.company, r.fr_field7,
    r.fr_field1, r.fr_field2, r.email, r.phone, r.barcode
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cortesias-redimidas-ctw-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

els.searchInput.addEventListener('input', render);
els.roleFilter.addEventListener('change', render);
els.exportButton.addEventListener('click', exportCsv);
els.refreshButton.addEventListener('click', () => loadData(true));
els.retryButton.addEventListener('click', () => loadData(true));

loadData(false);
setInterval(() => loadData(false), AUTO_REFRESH_MS);
