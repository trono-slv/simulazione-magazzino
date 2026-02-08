/*  ============================================================
    SCRIPT1.JS — CORE + INVENTARIO + CARICO + SCARICO + NUOVO
    ============================================================ */

var STORAGE_KEY = 'magazzino_data_v3';

function getStore() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { try { return JSON.parse(raw); } catch (e) { } }
    return { articoli: [], movCarico: [], movScarico: [], ddtList: [], ordiniList: [], ddtCounter: 1, ordineCounter: 1, artCounter: 7 };
}

function saveStore(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function oggi() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function oraAdesso() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function formatData(str) { if (!str) return '-'; var p = str.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : str; }
function formatValuta(n) { return '\u20AC ' + (n || 0).toFixed(2).replace('.', ','); }
function trovaArticolo(store, codice) { for (var i = 0; i < store.articoli.length; i++) { if (store.articoli[i].codice === codice) return i; } return -1; }
function stockClass(g, s) { if (g === 0) return 'stock-critical'; if (g <= s) return 'stock-low'; return 'stock-ok'; }
function stockLabel(g, s) { if (g === 0) return 'Esaurito'; if (g <= s) return 'Sotto scorta'; return 'Disponibile'; }

function showAlert(id, type, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<div class="alert alert-' + type + '">' + msg + '</div>';
    setTimeout(function () { el.innerHTML = ''; }, 6000);
}

function updateHeaderStats() {
    var s = getStore(), tot = 0, val = 0, alr = 0;
    for (var i = 0; i < s.articoli.length; i++) {
        tot += s.articoli[i].giacenza;
        val += s.articoli[i].giacenza * s.articoli[i].prezzo;
        if (s.articoli[i].giacenza <= s.articoli[i].scortaMin) alr++;
    }
    var e1 = document.getElementById('statArticoli');
    var e2 = document.getElementById('statGiacenza');
    var e3 = document.getElementById('statAllarmi');
    var e4 = document.getElementById('statValore');
    if (e1) e1.textContent = s.articoli.length;
    if (e2) e2.textContent = tot;
    if (e3) e3.textContent = alr;
    if (e4) e4.textContent = '\u20AC ' + val.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function setDataOggi(id) { var el = document.getElementById(id); if (el && !el.value) el.value = oggi(); }

function popolaSelect(selId) {
    var s = getStore(), sel = document.getElementById(selId);
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = '<option value="">-- Seleziona articolo --</option>';
    for (var i = 0; i < s.articoli.length; i++) {
        var a = s.articoli[i];
        sel.innerHTML += '<option value="' + a.codice + '">' + a.codice + ' - ' + a.descrizione + ' (Giac: ' + a.giacenza + ' ' + a.um + ')</option>';
    }
    if (cur) sel.value = cur;
}

function initSampleData() {
    var s = getStore();
    if (s.articoli.length > 0) return;
    s.articoli = [
        { codice: 'ART-001', descrizione: 'Monitor LED 24"', categoria: 'Elettronica', um: 'PZ', giacenza: 25, scortaMin: 5, prezzo: 189.90, posizione: 'Scaffale A-1', note: '' },
        { codice: 'ART-002', descrizione: 'Tastiera Meccanica USB', categoria: 'Elettronica', um: 'PZ', giacenza: 42, scortaMin: 10, prezzo: 59.90, posizione: 'Scaffale A-2', note: '' },
        { codice: 'ART-003', descrizione: 'Cacciavite Phillips PH2', categoria: 'Ferramenta', um: 'PZ', giacenza: 3, scortaMin: 10, prezzo: 8.50, posizione: 'Scaffale B-1', note: 'Sotto scorta' },
        { codice: 'ART-004', descrizione: 'Risma Carta A4 500fg', categoria: 'Cancelleria', um: 'CF', giacenza: 120, scortaMin: 20, prezzo: 4.90, posizione: 'Scaffale C-1', note: '' },
        { codice: 'ART-005', descrizione: 'Mouse Wireless Ergonomico', categoria: 'Elettronica', um: 'PZ', giacenza: 0, scortaMin: 5, prezzo: 29.90, posizione: 'Scaffale A-2', note: 'Esaurito' },
        { codice: 'ART-006', descrizione: 'Cavo HDMI 2m', categoria: 'Elettronica', um: 'PZ', giacenza: 67, scortaMin: 15, prezzo: 12.90, posizione: 'Scaffale A-3', note: '' }
    ];
    s.artCounter = 7;
    saveStore(s);
}

/* ====== NAVIGAZIONE ====== */
window.switchTab = function (tabName) {
    var secs = document.querySelectorAll('.section');
    for (var i = 0; i < secs.length; i++) secs[i].classList.remove('active');
    var tabs = document.querySelectorAll('.nav-tab');
    for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
    var sec = document.getElementById('sec-' + tabName);
    if (sec) sec.classList.add('active');
    var tab = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
    if (tab) tab.classList.add('active');
    if (tabName === 'inventario') renderInventario();
    if (tabName === 'carico') { popolaSelect('caricoArticolo'); renderStoricoCarichi(); setDataOggi('caricoData'); }
    if (tabName === 'scarico') { popolaSelect('scaricoArticolo'); renderStoricoScarichi(); setDataOggi('scaricoData'); }
    if (tabName === 'nuovo') generaNuovoCodice();
    if (tabName === 'ddt') { if (typeof inizializzaDDT === 'function') inizializzaDDT(); }
    if (tabName === 'ordini') { if (typeof inizializzaOrdini === 'function') inizializzaOrdini(); }
};

/* ====== INVENTARIO ====== */
function renderInventario() {
    var s = getStore();
    var body = document.getElementById('inventarioBody');
    if (!body) return;
    var search = (document.getElementById('searchInventario') || {}).value || '';
    var cat = (document.getElementById('filterCategoria') || {}).value || '';
    search = search.toLowerCase();
    var html = '', count = 0;
    for (var i = 0; i < s.articoli.length; i++) {
        var a = s.articoli[i];
        if (cat && a.categoria !== cat) continue;
        if (search && a.codice.toLowerCase().indexOf(search) === -1 && a.descrizione.toLowerCase().indexOf(search) === -1 && (a.posizione || '').toLowerCase().indexOf(search) === -1) continue;
        count++;
        html += '<tr>' +
            '<td><strong>' + a.codice + '</strong></td>' +
            '<td>' + a.descrizione + '</td>' +
            '<td>' + a.categoria + '</td>' +
            '<td class="text-center">' + a.um + '</td>' +
            '<td class="text-right"><strong>' + a.giacenza + '</strong></td>' +
            '<td class="text-center"><span class="stock-badge ' + stockClass(a.giacenza, a.scortaMin) + '">' + stockLabel(a.giacenza, a.scortaMin) + '</span></td>' +
            '<td class="text-right">' + formatValuta(a.prezzo) + '</td>' +
            '<td>' + (a.posizione || '-') + '</td>' +
            '<td class="text-center"><div class="actions-cell">' +
            '<button class="btn btn-sm btn-outline" onclick="apriModalModifica(\'' + a.codice + '\')">✏️</button>' +
            '<button class="btn btn-sm btn-danger" onclick="apriModalElimina(\'' + a.codice + '\')">🗑️</button>' +
            '</div></td></tr>';
    }
    if (count === 0) html = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#999;">Nessun articolo trovato</td></tr>';
    body.innerHTML = html;
}

window.filtraInventario = function () { renderInventario(); };

/* ====== MODAL MODIFICA ====== */
window.apriModalModifica = function (codice) {
    var s = getStore(), idx = trovaArticolo(s, codice);
    if (idx === -1) return;
    var a = s.articoli[idx];
    document.getElementById('editCodice').value = a.codice;
    document.getElementById('editDescrizione').value = a.descrizione;
    document.getElementById('editCategoria').value = a.categoria;
    document.getElementById('editUM').value = a.um;
    document.getElementById('editGiacenza').value = a.giacenza;
    document.getElementById('editScortaMin').value = a.scortaMin;
    document.getElementById('editPrezzo').value = a.prezzo;
    document.getElementById('editPosizione').value = a.posizione || '';
    document.getElementById('editNote').value = a.note || '';
    document.getElementById('modalModifica').classList.add('open');
};

window.chiudiModalModifica = function () {
    document.getElementById('modalModifica').classList.remove('open');
};

window.salvaModifica = function () {
    var codice = document.getElementById('editCodice').value;
    var desc = document.getElementById('editDescrizione').value.trim();
    if (!desc) { alert('Descrizione obbligatoria.'); return; }
    var s = getStore(), idx = trovaArticolo(s, codice);
    if (idx === -1) return;
    s.articoli[idx].descrizione = desc;
    s.articoli[idx].categoria = document.getElementById('editCategoria').value;
    s.articoli[idx].um = document.getElementById('editUM').value;
    s.articoli[idx].giacenza = parseInt(document.getElementById('editGiacenza').value) || 0;
    s.articoli[idx].scortaMin = parseInt(document.getElementById('editScortaMin').value) || 0;
    s.articoli[idx].prezzo = parseFloat(document.getElementById('editPrezzo').value) || 0;
    s.articoli[idx].posizione = document.getElementById('editPosizione').value.trim();
    s.articoli[idx].note = document.getElementById('editNote').value.trim();
    saveStore(s);
    chiudiModalModifica();
    updateHeaderStats();
    renderInventario();
    showAlert('alertInventario', 'success', 'Articolo <strong>' + codice + '</strong> modificato!');
};

/* ====== MODAL ELIMINA ====== */
var codiceEliminare = '';

window.apriModalElimina = function (codice) {
    var s = getStore(), idx = trovaArticolo(s, codice);
    if (idx === -1) return;
    var a = s.articoli[idx];
    document.getElementById('eliminaCodice').textContent = a.codice;
    document.getElementById('eliminaDescrizione').textContent = a.descrizione;
    document.getElementById('eliminaGiacenza').textContent = a.giacenza + ' ' + a.um;
    codiceEliminare = codice;
    document.getElementById('modalElimina').classList.add('open');
};

window.chiudiModalElimina = function () {
    document.getElementById('modalElimina').classList.remove('open');
    codiceEliminare = '';
};

window.confermaElimina = function () {
    if (!codiceEliminare) return;
    var s = getStore(), idx = trovaArticolo(s, codiceEliminare);
    if (idx === -1) return;
    var desc = s.articoli[idx].descrizione;
    s.articoli.splice(idx, 1);
    saveStore(s);
    chiudiModalElimina();
    updateHeaderStats();
    renderInventario();
    showAlert('alertInventario', 'warning', 'Articolo <strong>' + desc + '</strong> eliminato.');
};

/* ====== CARICO ====== */
window.registraCarico = function () {
    var codice = document.getElementById('caricoArticolo').value;
    var qta = parseInt(document.getElementById('caricoQta').value) || 0;
    var data = document.getElementById('caricoData').value;
    var fornitore = document.getElementById('caricoFornitore').value.trim();
    var documento = document.getElementById('caricoDocumento').value.trim();
    if (!codice) { showAlert('alertCarico', 'danger', 'Seleziona un articolo.'); return; }
    if (qta <= 0) { showAlert('alertCarico', 'danger', 'Quantità deve essere > 0.'); return; }
    if (!data) { showAlert('alertCarico', 'danger', 'Inserisci la data.'); return; }
    var s = getStore(), idx = trovaArticolo(s, codice);
    if (idx === -1) return;
    s.articoli[idx].giacenza += qta;
    s.movCarico.unshift({ data: data, ora: oraAdesso(), codice: codice, descrizione: s.articoli[idx].descrizione, qta: qta, fornitore: fornitore, documento: documento });
    saveStore(s);
    updateHeaderStats();
    popolaSelect('caricoArticolo');
    renderStoricoCarichi();
    document.getElementById('caricoQta').value = '1';
    document.getElementById('caricoFornitore').value = '';
    document.getElementById('caricoDocumento').value = '';
    document.getElementById('caricoArticolo').value = '';
    showAlert('alertCarico', 'success', 'Caricati <strong>' + qta + '</strong> pz di <strong>' + s.articoli[idx].descrizione + '</strong>. Nuova giacenza: <strong>' + s.articoli[idx].giacenza + '</strong>');
};

function renderStoricoCarichi() {
    var s = getStore(), body = document.getElementById('caricoBody');
    if (!body) return;
    if (s.movCarico.length === 0) { body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#999;">Nessun carico registrato</td></tr>'; return; }
    var html = '';
    for (var i = 0; i < s.movCarico.length; i++) {
        var m = s.movCarico[i];
        html += '<tr><td>' + formatData(m.data) + '</td><td>' + m.ora + '</td><td><strong>' + m.codice + '</strong></td><td>' + m.descrizione + '</td><td class="text-right"><strong>+' + m.qta + '</strong></td><td>' + (m.fornitore || '-') + '</td><td>' + (m.documento || '-') + '</td></tr>';
    }
    body.innerHTML = html;
}

/* ====== SCARICO ====== */
window.registraScarico = function () {
    var codice = document.getElementById('scaricoArticolo').value;
    var qta = parseInt(document.getElementById('scaricoQta').value) || 0;
    var data = document.getElementById('scaricoData').value;
    var causale = document.getElementById('scaricoCausale').value;
    var destinatario = document.getElementById('scaricoDestinatario').value.trim();
    var documento = document.getElementById('scaricoDocumento').value.trim();
    if (!codice) { showAlert('alertScarico', 'danger', 'Seleziona un articolo.'); return; }
    if (qta <= 0) { showAlert('alertScarico', 'danger', 'Quantità deve essere > 0.'); return; }
    if (!data) { showAlert('alertScarico', 'danger', 'Inserisci la data.'); return; }
    var s = getStore(), idx = trovaArticolo(s, codice);
    if (idx === -1) return;
    if (s.articoli[idx].giacenza < qta) { showAlert('alertScarico', 'danger', 'Giacenza insufficiente! Disponibili: <strong>' + s.articoli[idx].giacenza + ' ' + s.articoli[idx].um + '</strong>'); return; }
    s.articoli[idx].giacenza -= qta;
    s.movScarico.unshift({ data: data, ora: oraAdesso(), codice: codice, descrizione: s.articoli[idx].descrizione, qta: qta, causale: causale, destinatario: destinatario, documento: documento });
    saveStore(s);
    updateHeaderStats();
    popolaSelect('scaricoArticolo');
    renderStoricoScarichi();
    document.getElementById('scaricoQta').value = '1';
    document.getElementById('scaricoDestinatario').value = '';
    document.getElementById('scaricoDocumento').value = '';
    document.getElementById('scaricoArticolo').value = '';
    showAlert('alertScarico', 'success', 'Scaricati <strong>' + qta + '</strong> pz di <strong>' + s.articoli[idx].descrizione + '</strong>. Nuova giacenza: <strong>' + s.articoli[idx].giacenza + '</strong>');
};

function renderStoricoScarichi() {
    var s = getStore(), body = document.getElementById('scaricoBody');
    if (!body) return;
    if (s.movScarico.length === 0) { body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#999;">Nessuno scarico registrato</td></tr>'; return; }
    var html = '';
    for (var i = 0; i < s.movScarico.length; i++) {
        var m = s.movScarico[i];
        html += '<tr><td>' + formatData(m.data) + '</td><td>' + m.ora + '</td><td><strong>' + m.codice + '</strong></td><td>' + m.descrizione + '</td><td class="text-right"><strong>-' + m.qta + '</strong></td><td>' + (m.causale || '-') + '</td><td>' + (m.destinatario || '-') + '</td><td>' + (m.documento || '-') + '</td></tr>';
    }
    body.innerHTML = html;
}

/* ====== NUOVO ARTICOLO ====== */
function generaNuovoCodice() {
    var s = getStore();
    var num = s.artCounter || (s.articoli.length + 1);
    var codice = 'ART-' + ('000' + num).slice(-3);
    var el = document.getElementById('nuovoCodice');
    if (el) el.value = codice;
}

window.creaNuovoArticolo = function () {
    var codice = document.getElementById('nuovoCodice').value.trim();
    var desc = document.getElementById('nuovoDescrizione').value.trim();
    var cat = document.getElementById('nuovoCategoria').value;
    var um = document.getElementById('nuovoUM').value;
    var giacenza = parseInt(document.getElementById('nuovoGiacenza').value) || 0;
    var scorta = parseInt(document.getElementById('nuovoScortaMin').value) || 0;
    var prezzo = parseFloat(document.getElementById('nuovoPrezzo').value) || 0;
    var posizione = document.getElementById('nuovoPosizione').value.trim();
    var note = document.getElementById('nuovoNote').value.trim();

    if (!codice) { showAlert('alertNuovo', 'danger', 'Codice obbligatorio.'); return; }
    if (!desc) { showAlert('alertNuovo', 'danger', 'Descrizione obbligatoria.'); return; }
    if (!cat) { showAlert('alertNuovo', 'danger', 'Seleziona una categoria.'); return; }

    var s = getStore();
    if (trovaArticolo(s, codice) !== -1) { showAlert('alertNuovo', 'danger', 'Codice <strong>' + codice + '</strong> già esistente!'); return; }

    s.articoli.push({ codice: codice, descrizione: desc, categoria: cat, um: um, giacenza: giacenza, scortaMin: scorta, prezzo: prezzo, posizione: posizione, note: note });
    s.artCounter = (s.artCounter || 7) + 1;
    saveStore(s);
    updateHeaderStats();

    document.getElementById('nuovoDescrizione').value = '';
    document.getElementById('nuovoGiacenza').value = '0';
    document.getElementById('nuovoScortaMin').value = '0';
    document.getElementById('nuovoPrezzo').value = '0';
    document.getElementById('nuovoPosizione').value = '';
    document.getElementById('nuovoNote').value = '';
    generaNuovoCodice();
    showAlert('alertNuovo', 'success', 'Articolo <strong>' + codice + ' - ' + desc + '</strong> creato con successo!');
};

window.salvaNuovoArticolo = window.creaNuovoArticolo;

/* ====== RESET ====== */
window.resetTuttoDati = function () {
    if (confirm('ATTENZIONE: Vuoi davvero cancellare TUTTI i dati?\n\nAzione irreversibile!')) {
        localStorage.removeItem(STORAGE_KEY);
        initSampleData();
        updateHeaderStats();
        switchTab('inventario');
        showAlert('alertInventario', 'warning', 'Dati resettati. Dati esempio ricaricati.');
    }
};

/* ====== INIT ====== */
function init() {
    initSampleData();
    updateHeaderStats();
    renderInventario();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
