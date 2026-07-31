const FIELD_LABELS = {
  fr_field1: 'País',
  fr_field2: 'Ciudad',
  fr_field3: 'LinkedIn',
  fr_field9: 'Industria',
  fr_field11: 'Tamaño de empresa',
  fr_field13: 'Rol en el ecosistema',
  fr_field15: 'Objetivo al asistir'
};

const PALETTE = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5', '--series-6', '--series-7', '--series-8'];
const AUTO_REFRESH_MS = 30_000;

const els = {
  statusBadge: document.getElementById('statusBadge'),
  refreshButton: document.getElementById('refreshButton'),
  errorBanner: document.getElementById('errorBanner'),
  errorMessage: document.getElementById('errorMessage'),
  retryButton: document.getElementById('retryButton'),
  totalCount: document.getElementById('totalCount'),
  redeemedCount: document.getElementById('redeemedCount'),
  pendingCount: document.getElementById('pendingCount'),
  achievementRate: document.getElementById('achievementRate'),
  roleChart: document.getElementById('roleChart'),
  searchInput: document.getElementById('searchInput'),
  roleFilter: document.getElementById('roleFilter'),
  statusFilter: document.getElementById('statusFilter'),
  exportButton: document.getElementById('exportButton'),
  resultCount: document.getElementById('resultCount'),
  tableBody: document.getElementById('tableBody')
};

let records = [];
let roleColorMap = {};
let expandedIds = new Set();
let pendingIds = new Set();

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
  const status = els.statusFilter.value;

  return records.filter((r) => {
    if (role && (r.role || 'Sin rol') !== role) return false;
    if (status === 'redeemed' && !r.redeemed) return false;
    if (status === 'pending' && r.redeemed) return false;
    if (query) {
      const haystack = [r.fullName, r.company, r.email, r.identification, r.barcode]
        .map(normalizeText)
        .join(' ');
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function detailRowHtml(record) {
  const items = Object.entries(FIELD_LABELS)
    .map(([key, label]) => ({ label, value: record[key] }))
    .filter((item) => item.value);

  items.push({ label: 'Teléfono', value: record.phone });
  items.push({ label: 'Barcode', value: record.barcode });

  const cells = items
    .filter((item) => item.value)
    .map((item) => `<div class="detail-item"><span>${item.label}</span><strong>${item.value}</strong></div>`)
    .join('');

  return `<tr class="detail-row"><td colspan="7"><div class="detail-grid">${cells}</div></td></tr>`;
}

function render() {
  const filtered = getFiltered();

  els.resultCount.textContent = `${filtered.length} de ${records.length} registros`;

  if (!filtered.length) {
    els.tableBody.innerHTML = '<tr><td colspan="7" class="empty">No hay registros para mostrar con ese filtro.</td></tr>';
  } else {
    els.tableBody.innerHTML = filtered
      .map((record) => {
        const isRedeemed = Boolean(record.redeemed);
        const isExpanded = expandedIds.has(record.id);
        const isPending = pendingIds.has(record.id);
        const roleColor = roleColorMap[record.role || 'Sin rol'] || 'var(--series-other)';
        const location = [record.fr_field2, record.fr_field1].filter(Boolean).join(', ') || '—';

        const row = `
          <tr data-id="${record.id}">
            <td>
              <strong>${record.fullName || '—'}</strong><br />
              <small>${record.identification || '—'}</small>
            </td>
            <td><span class="role-badge" style="border-color:${roleColor};color:${roleColor}">${record.role || '—'}</span></td>
            <td>${record.company || '—'}<br /><small>${record.fr_field7 || ''}</small></td>
            <td>${location}</td>
            <td>${record.email || '—'}</td>
            <td><span class="badge ${isRedeemed ? 'redeemed' : 'pending'}">${isRedeemed ? 'Redimida' : 'Pendiente'}</span></td>
            <td>
              <div class="row-actions">
                <button class="icon-btn" data-toggle-detail="${record.id}" title="Ver más">${isExpanded ? '−' : '+'}</button>
                <button class="action-btn ${isRedeemed ? 'unmark' : 'mark'}" data-toggle-redeem="${record.id}" ${isPending ? 'disabled' : ''}>
                  ${isRedeemed ? 'Desmarcar' : 'Marcar redimida'}
                </button>
              </div>
            </td>
          </tr>
        `;

        return isExpanded ? row + detailRowHtml(record) : row;
      })
      .join('');
  }

  const total = records.length;
  const redeemed = records.filter((r) => r.redeemed).length;
  const pending = total - redeemed;
  const rate = total ? Math.round((redeemed / total) * 100) : 0;

  els.totalCount.textContent = total;
  els.redeemedCount.textContent = redeemed;
  els.pendingCount.textContent = pending;
  els.achievementRate.textContent = `${rate}%`;
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

async function toggleRedeem(id, nextRedeemed) {
  pendingIds.add(id);
  render();

  try {
    const response = await fetch(`/api/records/${id}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redeemed: nextRedeemed })
    });
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.message || 'No se pudo actualizar');

    const record = records.find((r) => r.id === id);
    if (record) {
      record.redeemed = payload.redeemed;
      record.redeemedAt = payload.redeemedAt;
    }
  } catch (error) {
    els.errorMessage.textContent = error.message;
    els.errorBanner.classList.remove('hidden');
  } finally {
    pendingIds.delete(id);
    render();
  }
}

function exportCsv() {
  const filtered = getFiltered();
  const headers = ['Nombre', 'Identificación', 'Rol', 'Empresa', 'Cargo', 'País', 'Ciudad', 'Correo', 'Teléfono', 'Barcode', 'Estado', 'Redimido en'];
  const rows = filtered.map((r) => [
    r.fullName, r.identification, r.role, r.company, r.fr_field7,
    r.fr_field1, r.fr_field2, r.email, r.phone, r.barcode,
    r.redeemed ? 'Redimida' : 'Pendiente', r.redeemedAt || ''
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cortesias-ctw-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

els.searchInput.addEventListener('input', render);
els.roleFilter.addEventListener('change', render);
els.statusFilter.addEventListener('change', render);
els.exportButton.addEventListener('click', exportCsv);
els.refreshButton.addEventListener('click', () => loadData(true));
els.retryButton.addEventListener('click', () => loadData(true));

els.tableBody.addEventListener('click', (event) => {
  const detailBtn = event.target.closest('button[data-toggle-detail]');
  if (detailBtn) {
    const id = Number(detailBtn.getAttribute('data-toggle-detail'));
    if (expandedIds.has(id)) expandedIds.delete(id);
    else expandedIds.add(id);
    render();
    return;
  }

  const redeemBtn = event.target.closest('button[data-toggle-redeem]');
  if (redeemBtn) {
    const id = Number(redeemBtn.getAttribute('data-toggle-redeem'));
    const record = records.find((r) => r.id === id);
    if (record) toggleRedeem(id, !record.redeemed);
  }
});

loadData(false);
setInterval(() => loadData(false), AUTO_REFRESH_MS);
