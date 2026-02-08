(function () {
    'use strict';

    /* ==========================================================
       STORAGE
       ========================================================== */
    var STORAGE_KEY = 'magazzino_data_v3';

    function getStore() {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) { try { return JSON.parse(raw); } catch (e) { } }
        return { articoli: [], movCarico: [], movScarico: [], ddtList: [], ordiniList: [], ddtCounter: 1, ordineCounter: 1, artCounter: 7 };
    }

    function saveStore(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

    /* ==========================================================
       DATI ESEMPIO
       ========================================================== */
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

    /* ==========================================================
       UTILITÀ
       ========================================================== */
    function oggi() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function oraAdesso() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function formatData(str) { if (!str) return '-'; var p = str.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : str; }
    function formatValuta(n) { return '\u20AC ' + (n || 0).toFixed(2).replace('.', ','); }

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

    function trovaArticolo(store, codice) {
        for (var i = 0; i < store.articoli.length; i++) {
            if (store.articoli[i].codice === codice) return i;
        }
        return -1;
    }

    function stockClass(g, s) { if (g === 0) return 'stock-critical'; if (g <= s) return 'stock-low'; return 'stock-ok'; }
    function stockLabel(g, s) { if (g === 0) return 'Esaurito'; if (g <= s) return 'Sotto scorta'; return 'Disponibile'; }

    /* ==========================================================
       NAVIGAZIONE TAB
       ========================================================== */
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
        if (tabName === 'ddt') inizializzaDDT();
        if (tabName === 'ordini') inizializzaOrdini();
    };

    /* ==========================================================
       INVENTARIO
       ========================================================== */
    function renderInventario() {
        var s = getStore();
        var body = document.getElementById('inventarioBody');
        if (!body) return;
        var search = (document.getElementById('searchInventario') || {}).value || '';
        var cat = (document.getElementById('filterCategoria') || {}).value || '';
        search = search.toLowerCase();
        var html = '';
        var count = 0;
        for (var i = 0; i < s.articoli.length; i++) {
            var a = s.articoli[i];
            if (cat && a.categoria !== cat) continue;
            if (search && a.codice.toLowerCase().indexOf(search) === -1 && a.descrizione.toLowerCase().indexOf(search) === -1 && a.posizione.toLowerCase().indexOf(search) === -1) continue;
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
        if (count === 0) html = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--gray-500);">Nessun articolo trovato</td></tr>';
        body.innerHTML = html;
    }

    window.filtraInventario = function () { renderInventario(); };

    /* ==========================================================
       MODAL MODIFICA
       ========================================================== */
    window.apriModalModifica = function (codice) {
        var s = getStore();
        var idx = trovaArticolo(s, codice);
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
        if (!desc) { alert('La descrizione è obbligatoria.'); return; }
        var s = getStore();
        var idx = trovaArticolo(s, codice);
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
        showAlert('alertInventario', 'success', 'Articolo <strong>' + codice + '</strong> modificato con successo!');
    };

    /* ==========================================================
       MODAL ELIMINA
       ========================================================== */
    var codiceEliminare = '';

    window.apriModalElimina = function (codice) {
        var s = getStore();
        var idx = trovaArticolo(s, codice);
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
        var s = getStore();
        var idx = trovaArticolo(s, codiceEliminare);
        if (idx === -1) return;
        var desc = s.articoli[idx].descrizione;
        s.articoli.splice(idx, 1);
        saveStore(s);
        chiudiModalElimina();
        updateHeaderStats();
        renderInventario();
        showAlert('alertInventario', 'warning', 'Articolo <strong>' + desc + '</strong> eliminato.');
    };

    /* ==========================================================
       CARICO MERCE
       ========================================================== */
    window.registraCarico = function () {
        var codice = document.getElementById('caricoArticolo').value;
        var qta = parseInt(document.getElementById('caricoQta').value) || 0;
        var data = document.getElementById('caricoData').value;
        var fornitore = document.getElementById('caricoFornitore').value.trim();
        var documento = document.getElementById('caricoDocumento').value.trim();

        if (!codice) { showAlert('alertCarico', 'danger', 'Seleziona un articolo.'); return; }
        if (qta <= 0) { showAlert('alertCarico', 'danger', 'La quantità deve essere maggiore di zero.'); return; }
        if (!data) { showAlert('alertCarico', 'danger', 'Inserisci la data.'); return; }

        var s = getStore();
        var idx = trovaArticolo(s, codice);
        if (idx === -1) { showAlert('alertCarico', 'danger', 'Articolo non trovato.'); return; }

        s.articoli[idx].giacenza += qta;
        s.movCarico.unshift({
            data: data,
            ora: oraAdesso(),
            codice: codice,
            descrizione: s.articoli[idx].descrizione,
            qta: qta,
            fornitore: fornitore,
            documento: documento
        });
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
        var s = getStore();
        var body = document.getElementById('caricoBody');
        if (!body) return;
        if (s.movCarico.length === 0) { body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-500);">Nessun carico registrato</td></tr>'; return; }
        var html = '';
        for (var i = 0; i < s.movCarico.length; i++) {
            var m = s.movCarico[i];
            html += '<tr><td>' + formatData(m.data) + '</td><td>' + m.ora + '</td><td><strong>' + m.codice + '</strong></td><td>' + m.descrizione + '</td><td class="text-right"><strong>+' + m.qta + '</strong></td><td>' + (m.fornitore || '-') + '</td><td>' + (m.documento || '-') + '</td></tr>';
        }
        body.innerHTML = html;
    }

    /* ==========================================================
       SCARICO MERCE
       ========================================================== */
    window.registraScarico = function () {
        var codice = document.getElementById('scaricoArticolo').value;
        var qta = parseInt(document.getElementById('scaricoQta').value) || 0;
        var data = document.getElementById('scaricoData').value;
        var causale = document.getElementById('scaricoCausale').value;
        var destinatario = document.getElementById('scaricoDestinatario').value.trim();
        var documento = document.getElementById('scaricoDocumento').value.trim();

        if (!codice) { showAlert('alertScarico', 'danger', 'Seleziona un articolo.'); return; }
        if (qta <= 0) { showAlert('alertScarico', 'danger', 'La quantità deve essere maggiore di zero.'); return; }
        if (!data) { showAlert('alertScarico', 'danger', 'Inserisci la data.'); return; }

        var s = getStore();
        var idx = trovaArticolo(s, codice);
        if (idx === -1) { showAlert('alertScarico', 'danger', 'Articolo non trovato.'); return; }
        if (s.articoli[idx].giacenza < qta) {
            showAlert('alertScarico', 'danger', 'Giacenza insufficiente! Disponibili: <strong>' + s.articoli[idx].giacenza + ' ' + s.articoli[idx].um + '</strong>');
            return;
        }

        s.articoli[idx].giacenza -= qta;
        s.movScarico.unshift({
            data: data,
            ora: oraAdesso(),
            codice: codice,
            descrizione: s.articoli[idx].descrizione,
            qta: qta,
            causale: causale,
            destinatario: destinatario,
            documento: documento
        });
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
        var s = getStore();
        var body = document.getElementById('scaricoBody');
        if (!body) return;
        if (s.movScarico.length === 0) { body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray-500);">Nessuno scarico registrato</td></tr>'; return; }
        var html = '';
        for (var i = 0; i < s.movScarico.length; i++) {
            var m = s.movScarico[i];
            html += '<tr><td>' + formatData(m.data) + '</td><td>' + m.ora + '</td><td><strong>' + m.codice + '</strong></td><td>' + m.descrizione + '</td><td class="text-right"><strong>-' + m.qta + '</strong></td><td>' + (m.causale || '-') + '</td><td>' + (m.destinatario || '-') + '</td><td>' + (m.documento || '-') + '</td></tr>';
        }
        body.innerHTML = html;
    }

    /* ==========================================================
       NUOVO ARTICOLO
       ========================================================== */
    function generaNuovoCodice() {
        var s = getStore();
        var num = s.artCounter || (s.articoli.length + 1);
        var codice = 'ART-' + ('000' + num).slice(-3);
        var el = document.getElementById('nuovoCodice');
        if (el) el.value = codice;
    }

    // Supporto entrambi i nomi (HTML chiama creaNuovoArticolo)
    window.creaNuovoArticolo = window.salvaNuovoArticolo = function () {
        var codice = (document.getElementById('nuovoCodice').value || '').trim();
        var desc = (document.getElementById('nuovoDescrizione').value || '').trim();
        var cat = (document.getElementById('nuovoCategoria').value || '');
        var um = (document.getElementById('nuovoUM').value || 'PZ');
        var giac = parseInt(document.getElementById('nuovoGiacenza').value) || 0;
        var scMin = parseInt(document.getElementById('nuovoScortaMin').value) || 0;
        var prezzo = parseFloat(document.getElementById('nuovoPrezzo').value) || 0;
        var pos = (document.getElementById('nuovoPosizione').value || '').trim();
        var note = (document.getElementById('nuovoNote').value || '').trim();

        if (!desc) { showAlert('alertNuovo', 'danger', 'La descrizione è obbligatoria.'); return; }
        if (!cat) { showAlert('alertNuovo', 'danger', 'Seleziona una categoria.'); return; }

        var s = getStore();

        // Controlla duplicato
        if (trovaArticolo(s, codice) !== -1) {
            showAlert('alertNuovo', 'danger', 'Codice <strong>' + codice + '</strong> già esistente!');
            return;
        }

        s.articoli.push({
            codice: codice,
            descrizione: desc,
            categoria: cat,
            um: um,
            giacenza: giac,
            scortaMin: scMin,
            prezzo: prezzo,
            posizione: pos,
            note: note
        });
        s.artCounter = (s.artCounter || 7) + 1;
        saveStore(s);
        updateHeaderStats();
        showAlert('alertNuovo', 'success', 'Articolo <strong>' + codice + ' - ' + desc + '</strong> creato con successo!');
        resetFormNuovo();
        generaNuovoCodice();
    };

    window.resetFormNuovo = function () {
        document.getElementById('nuovoDescrizione').value = '';
        document.getElementById('nuovoCategoria').value = '';
        document.getElementById('nuovoGiacenza').value = '0';
        document.getElementById('nuovoScortaMin').value = '5';
        document.getElementById('nuovoPrezzo').value = '0';
        document.getElementById('nuovoPosizione').value = '';
        document.getElementById('nuovoNote').value = '';
    };

    /* ==========================================================
       DDT
       ========================================================== */
    var ddtRighe = [];

    function inizializzaDDT() {
        var s = getStore();
        var num = 'DDT-' + oggi().replace(/-/g, '').slice(2) + '-' + ('000' + s.ddtCounter).slice(-3);
        var elNum = document.getElementById('ddtNumero');
        if (elNum) elNum.value = num;
        setDataOggi('ddtData');
        popolaSelect('ddtArticoloSel');
        renderDDTRighe();
        renderDDTList();
    }

    window.aggiungiRigaDDT = function () {
        var codice = document.getElementById('ddtArticoloSel').value;
        var qta = parseInt(document.getElementById('ddtArticoloQta').value) || 0;
        if (!codice) { showAlert('alertDDT', 'danger', 'Seleziona un articolo.'); return; }
        if (qta <= 0) { showAlert('alertDDT', 'danger', 'Quantità non valida.'); return; }

        var s = getStore();
        var idx = trovaArticolo(s, codice);
        if (idx === -1) return;
        var a = s.articoli[idx];

        // Controlla se già aggiunto
        for (var i = 0; i < ddtRighe.length; i++) {
            if (ddtRighe[i].codice === codice) {
                ddtRighe[i].qta += qta;
                renderDDTRighe();
                return;
            }
        }

        ddtRighe.push({ codice: a.codice, descrizione: a.descrizione, um: a.um, qta: qta, prezzo: a.prezzo });
        document.getElementById('ddtArticoloQta').value = '1';
        document.getElementById('ddtArticoloSel').value = '';
        renderDDTRighe();
    };

    window.rimuoviRigaDDT = function (idx) {
        ddtRighe.splice(idx, 1);
        renderDDTRighe();
    };

    function renderDDTRighe() {
        var body = document.getElementById('ddtRigheBody');
        var totBox = document.getElementById('ddtTotale');
        if (!body) return;
        if (ddtRighe.length === 0) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--gray-500);">Nessun articolo aggiunto</td></tr>';
            if (totBox) totBox.innerHTML = '';
            return;
        }
        var html = '', totale = 0;
        for (var i = 0; i < ddtRighe.length; i++) {
            var r = ddtRighe[i];
            var sub = r.qta * r.prezzo;
            totale += sub;
            html += '<tr><td><strong>' + r.codice + '</strong></td><td>' + r.descrizione + '</td><td class="text-center">' + r.um + '</td><td class="text-right">' + r.qta + '</td><td class="text-right">' + formatValuta(r.prezzo) + '</td><td class="text-right">' + formatValuta(sub) + '</td><td class="text-center"><button class="btn btn-sm btn-danger" onclick="rimuoviRigaDDT(' + i + ')">✕</button></td></tr>';
        }
        body.innerHTML = html;
        if (totBox) totBox.innerHTML = '<strong>Totale: ' + formatValuta(totale) + '</strong>';
    }

    window.resetFormDDT = function () {
        ddtRighe = [];
        document.getElementById('ddtDestinatario').value = '';
        document.getElementById('ddtIndirizzo').value = '';
        document.getElementById('ddtNote').value = '';
        renderDDTRighe();
        inizializzaDDT();
    };

    window.emettiDDT = function () {
        var dest = (document.getElementById('ddtDestinatario').value || '').trim();
        var data = document.getElementById('ddtData').value;
        var numero = document.getElementById('ddtNumero').value;
        var indirizzo = (document.getElementById('ddtIndirizzo').value || '').trim();
        var causale = document.getElementById('ddtCausale').value;
        var trasporto = document.getElementById('ddtTrasporto').value;
        var note = (document.getElementById('ddtNote').value || '').trim();

        if (!dest) { showAlert('alertDDT', 'danger', 'Inserisci il destinatario.'); return; }
        if (!data) { showAlert('alertDDT', 'danger', 'Inserisci la data.'); return; }
        if (ddtRighe.length === 0) { showAlert('alertDDT', 'danger', 'Aggiungi almeno un articolo.'); return; }

        // Verifica giacenze
        var s = getStore();
        for (var i = 0; i < ddtRighe.length; i++) {
            var idx = trovaArticolo(s, ddtRighe[i].codice);
            if (idx === -1) { showAlert('alertDDT', 'danger', 'Articolo ' + ddtRighe[i].codice + ' non trovato.'); return; }
            if (s.articoli[idx].giacenza < ddtRighe[i].qta) {
                showAlert('alertDDT', 'danger', 'Giacenza insufficiente per <strong>' + ddtRighe[i].descrizione + '</strong> (Disp: ' + s.articoli[idx].giacenza + ', Rich: ' + ddtRighe[i].qta + ')');
                return;
            }
        }

        // Scarica merce
        var totale = 0;
        for (var j = 0; j < ddtRighe.length; j++) {
            var idx2 = trovaArticolo(s, ddtRighe[j].codice);
            s.articoli[idx2].giacenza -= ddtRighe[j].qta;
            totale += ddtRighe[j].qta * ddtRighe[j].prezzo;
            s.movScarico.unshift({
                data: data, ora: oraAdesso(), codice: ddtRighe[j].codice,
                descrizione: ddtRighe[j].descrizione, qta: ddtRighe[j].qta,
                causale: 'DDT ' + numero, destinatario: dest, documento: numero
            });
        }

        var ddtObj = {
            numero: numero, data: data, destinatario: dest, indirizzo: indirizzo,
            causale: causale, trasporto: trasporto, note: note,
            righe: JSON.parse(JSON.stringify(ddtRighe)), totale: totale
        };
        s.ddtList.unshift(ddtObj);
        s.ddtCounter = (s.ddtCounter || 1) + 1;
        saveStore(s);
        updateHeaderStats();
        ddtRighe = [];
        showAlert('alertDDT', 'success', 'DDT <strong>' + numero + '</strong> emesso con successo! Merce scaricata dal magazzino.');
        resetFormDDT();
    };

    function renderDDTList() {
        var s = getStore();
        var body = document.getElementById('ddtListBody');
        var empty = document.getElementById('emptyDDT');
        if (!body) return;
        if (s.ddtList.length === 0) {
            body.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';
        var html = '';
        for (var i = 0; i < s.ddtList.length; i++) {
            var d = s.ddtList[i];
            html += '<tr><td><strong>' + d.numero + '</strong></td><td>' + formatData(d.data) + '</td><td>' + d.destinatario + '</td><td>' + d.causale + '</td><td class="text-right">' + d.righe.length + '</td><td class="text-right">' + formatValuta(d.totale) + '</td><td class="text-center"><button class="btn btn-sm btn-outline" onclick="vediDDT(' + i + ')">👁️</button></td></tr>';
        }
        body.innerHTML = html;
    }

    window.vediDDT = function (idx) {
        var s = getStore();
        var d = s.ddtList[idx];
        if (!d) return;
        var html = '<div style="font-family:monospace;font-size:13px;line-height:1.8;">';
        html += '<div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px;">';
        html += '<h2 style="margin:0;">DOCUMENTO DI TRASPORTO</h2>';
        html += '<p style="margin:4px 0;"><strong>' + d.numero + '</strong> del ' + formatData(d.data) + '</p></div>';
        html += '<p><strong>Destinatario:</strong> ' + d.destinatario + '</p>';
        if (d.indirizzo) html += '<p><strong>Indirizzo:</strong> ' + d.indirizzo + '</p>';
        html += '<p><strong>Causale:</strong> ' + d.causale + ' | <strong>Trasporto:</strong> ' + d.trasporto + '</p>';
        html += '<table style="width:100%;border-collapse:collapse;margin:15px 0;">';
        html += '<thead><tr style="border-bottom:2px solid #000;"><th style="text-align:left;padding:6px;">Codice</th><th style="text-align:left;padding:6px;">Descrizione</th><th style="text-align:center;padding:6px;">U.M.</th><th style="text-align:right;padding:6px;">Qtà</th><th style="text-align:right;padding:6px;">Prezzo</th><th style="text-align:right;padding:6px;">Totale</th></tr></thead><tbody>';
        var tot = 0;
        for (var i = 0; i < d.righe.length; i++) {
            var r = d.righe[i], sub = r.qta * r.prezzo;
            tot += sub;
            html += '<tr style="border-bottom:1px solid #ccc;"><td style="padding:6px;">' + r.codice + '</td><td style="padding:6px;">' + r.descrizione + '</td><td style="text-align:center;padding:6px;">' + r.um + '</td><td style="text-align:right;padding:6px;">' + r.qta + '</td><td style="text-align:right;padding:6px;">' + formatValuta(r.prezzo) + '</td><td style="text-align:right;padding:6px;">' + formatValuta(sub) + '</td></tr>';
        }
        html += '</tbody></table>';
        html += '<p style="text-align:right;font-size:16px;"><strong>TOTALE: ' + formatValuta(tot) + '</strong></p>';
        if (d.note) html += '<p><strong>Note:</strong> ' + d.note + '</p>';
        html += '<div style="display:flex;justify-content:space-between;margin-top:40px;padding-top:10px;border-top:1px solid #ccc;"><div><p>Firma Mittente</p><br><p>___________________</p></div><div><p>Firma Destinatario</p><br><p>___________________</p></div></div>';
        html += '</div>';
        document.getElementById('ddtPreviewBody').innerHTML = html;
        document.getElementById('modalDDTPreview').classList.add('open');
    };

    window.chiudiModalDDT = function () {
        document.getElementById('modalDDTPreview').classList.remove('open');
    };

    window.stampaDDT = function () {
        var content = document.getElementById('ddtPreviewBody').innerHTML;
        var win = window.open('', '_blank');
        win.document.write('<html><head><title>Stampa DDT</title><style>body{font-family:monospace;padding:30px;font-size:13px;line-height:1.8;}table{width:100%;border-collapse:collapse;}th,td{padding:6px;}@media print{body{padding:10px;}}</style></head><body>' + content + '</body></html>');
        win.document.close();
        setTimeout(function () { win.print(); }, 500);
    };

    /* ==========================================================
       ORDINI
       ========================================================== */
    var ordineRighe = [];

    function inizializzaOrdini() {
        var s = getStore();
        var num = 'ORD-' + oggi().replace(/-/g, '').slice(2) + '-' + ('000' + s.ordineCounter).slice(-3);
        var elNum = document.getElementById('ordineNumero');
        if (elNum) elNum.value = num;
        setDataOggi('ordineData');
        popolaSelect('ordineArticoloSel');
        renderOrdineRighe();
        renderOrdiniList();
    }

    window.aggiungiRigaOrdine = function () {
        var codice = document.getElementById('ordineArticoloSel').value;
        var qta = parseInt(document.getElementById('ordineArticoloQta').value) || 0;
        if (!codice) { showAlert('alertOrdine', 'danger', 'Seleziona un articolo.'); return; }
        if (qta <= 0) { showAlert('alertOrdine', 'danger', 'Quantità non valida.'); return; }

        var s = getStore();
        var idx = trovaArticolo(s, codice);
        if (idx === -1) return;
        var a = s.articoli[idx];

        for (var i = 0; i < ordineRighe.length; i++) {
            if (ordineRighe[i].codice === codice) {
                ordineRighe[i].qta += qta;
                renderOrdineRighe();
                return;
            }
        }

        ordineRighe.push({ codice: a.codice, descrizione: a.descrizione, um: a.um, qta: qta, prezzo: a.prezzo });
        document.getElementById('ordineArticoloQta').value = '1';
        document.getElementById('ordineArticoloSel').value = '';
        renderOrdineRighe();
    };

    window.rimuoviRigaOrdine = function (idx) {
        ordineRighe.splice(idx, 1);
        renderOrdineRighe();
    };

    function renderOrdineRighe() {
        var body = document.getElementById('ordineRigheBody');
        var totBox = document.getElementById('ordineTotale');
        if (!body) return;
        if (ordineRighe.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gray-500);">Nessun articolo aggiunto</td></tr>';
            if (totBox) totBox.innerHTML = '';
            return;
        }
        var html = '', totale = 0;
        for (var i = 0; i < ordineRighe.length; i++) {
            var r = ordineRighe[i], sub = r.qta * r.prezzo;
            totale += sub;
            html += '<tr><td><strong>' + r.codice + '</strong></td><td>' + r.descrizione + '</td><td class="text-center">' + r.um + '</td><td class="text-right">' + r.qta + '</td><td class="text-right">' + formatValuta(sub) + '</td><td class="text-center"><button class="btn btn-sm btn-danger" onclick="rimuoviRigaOrdine(' + i + ')">✕</button></td></tr>';
        }
        body.innerHTML = html;
        if (totBox) totBox.innerHTML = '<strong>Totale Ordine: ' + formatValuta(totale) + '</strong>';
    }

    window.resetFormOrdine = function () {
        ordineRighe = [];
        document.getElementById('ordineFornitore').value = '';
        document.getElementById('ordineNote').value = '';
        renderOrdineRighe();
        inizializzaOrdini();
    };

    window.creaOrdine = function () {
        var numero = document.getElementById('ordineNumero').value;
        var data = document.getElementById('ordineData').value;
        var fornitore = (document.getElementById('ordineFornitore').value || '').trim();
        var tipo = document.getElementById('ordineTipo').value;
        var note = (document.getElementById('ordineNote').value || '').trim();

        if (!fornitore) { showAlert('alertOrdine', 'danger', 'Inserisci il fornitore/cliente.'); return; }
        if (ordineRighe.length === 0) { showAlert('alertOrdine', 'danger', 'Aggiungi almeno un articolo.'); return; }

        var totale = 0;
        for (var i = 0; i < ordineRighe.length; i++) totale += ordineRighe[i].qta * ordineRighe[i].prezzo;

        var s = getStore();
        s.ordiniList.unshift({
            numero: numero, data: data, fornitore: fornitore, tipo: tipo,
            note: note, righe: JSON.parse(JSON.stringify(ordineRighe)),
            totale: totale, stato: 'In attesa'
        });
        s.ordineCounter = (s.ordineCounter || 1) + 1;
        saveStore(s);
        updateHeaderStats();
        ordineRighe = [];
        showAlert('alertOrdine', 'success', 'Ordine <strong>' + numero + '</strong> creato con successo!');
        resetFormOrdine();
    };

    function renderOrdiniList() {
        var s = getStore();
        var body = document.getElementById('ordiniListBody');
        var empty = document.getElementById('emptyOrdini');
        if (!body) return;
        if (s.ordiniList.length === 0) {
            body.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';
        var html = '';
        for (var i = 0; i < s.ordiniList.length; i++) {
            var o = s.ordiniList[i];
            var statusClass = 'status-pending';
            if (o.stato === 'Confermato') statusClass = 'status-confirmed';
            if (o.stato === 'Spedito') statusClass = 'status-shipped';
            if (o.stato === 'Consegnato') statusClass = 'status-delivered';
            if (o.stato === 'Annullato') statusClass = 'status-cancelled';

            var selectHtml = '<select class="form-control" style="font-size:11px;padding:4px 8px;width:auto;" onchange="aggiornaStatoOrdine(' + i + ',this.value)">' +
                '<option value="In attesa"' + (o.stato === 'In attesa' ? ' selected' : '') + '>In attesa</option>' +
                '<option value="Confermato"' + (o.stato === 'Confermato' ? ' selected' : '') + '>Confermato</option>' +
                '<option value="Spedito"' + (o.stato === 'Spedito' ? ' selected' : '') + '>Spedito</option>' +
                '<option value="Consegnato"' + (o.stato === 'Consegnato' ? ' selected' : '') + '>Consegnato</option>' +
                '<option value="Annullato"' + (o.stato === 'Annullato' ? ' selected' : '') + '>Annullato</option>' +
                '</select>';

            html += '<tr><td><strong>' + o.numero + '</strong></td><td>' + formatData(o.data) + '</td><td>' + o.fornitore + '</td><td>' + (o.tipo || 'Acquisto') + '</td><td class="text-right">' + o.righe.length + '</td><td class="text-right">' + formatValuta(o.totale) + '</td><td class="text-center"><span class="status-badge ' + statusClass + '">' + o.stato + '</span></td><td class="text-center">' + selectHtml + '</td></tr>';
        }
        body.innerHTML = html;
    }

    window.aggiornaStatoOrdine = function (idx, nuovoStato) {
        var s = getStore();
        if (!s.ordiniList[idx]) return;
        var vecchioStato = s.ordiniList[idx].stato;
        s.ordiniList[idx].stato = nuovoStato;

        // Se ordine ACQUISTO → "Consegnato" = carica merce
        if (nuovoStato === 'Consegnato' && vecchioStato !== 'Consegnato' && (s.ordiniList[idx].tipo === 'Acquisto' || !s.ordiniList[idx].tipo)) {
            for (var i = 0; i < s.ordiniList[idx].righe.length; i++) {
                var r = s.ordiniList[idx].righe[i];
                var artIdx = trovaArticolo(s, r.codice);
                if (artIdx !== -1) {
                    s.articoli[artIdx].giacenza += r.qta;
                    s.movCarico.unshift({
                        data: oggi(), ora: oraAdesso(), codice: r.codice,
                        descrizione: r.descrizione, qta: r.qta,
                        fornitore: s.ordiniList[idx].fornitore, documento: s.ordiniList[idx].numero
                    });
                }
            }
            showAlert('alertOrdine', 'success', 'Ordine <strong>' + s.ordiniList[idx].numero + '</strong> consegnato! Merce caricata in magazzino.');
        }
        // Se ordine VENDITA → "Consegnato" = scarica merce
        else if (nuovoStato === 'Consegnato' && vecchioStato !== 'Consegnato' && s.ordiniList[idx].tipo === 'Vendita') {
            for (var j = 0; j < s.ordiniList[idx].righe.length; j++) {
                var rv = s.ordiniList[idx].righe[j];
                var artIdx2 = trovaArticolo(s, rv.codice);
                if (artIdx2 !== -1) {
                    s.articoli[artIdx2].giacenza -= rv.qta;
                    if (s.articoli[artIdx2].giacenza < 0) s.articoli[artIdx2].giacenza = 0;
                    s.movScarico.unshift({
                        data: oggi(), ora: oraAdesso(), codice: rv.codice,
                        descrizione: rv.descrizione, qta: rv.qta,
                        causale: 'Ordine vendita', destinatario: s.ordiniList[idx].fornitore,
                        documento: s.ordiniList[idx].numero
                    });
                }
            }
            showAlert('alertOrdine', 'success', 'Ordine vendita <strong>' + s.ordiniList[idx].numero + '</strong> consegnato! Merce scaricata.');
        } else {
            showAlert('alertOrdine', 'info', 'Stato ordine aggiornato a: <strong>' + nuovoStato + '</strong>');
        }

        saveStore(s);
        updateHeaderStats();
        renderOrdiniList();
    };

    /* ==========================================================
       RESET TUTTI I DATI
       ========================================================== */
    window.resetTuttoDati = function () {
        if (confirm('ATTENZIONE: Vuoi davvero cancellare TUTTI i dati?\n\nQuesta azione è irreversibile!')) {
            localStorage.removeItem(STORAGE_KEY);
            initSampleData();
            updateHeaderStats();
            switchTab('inventario');
            showAlert('alertInventario', 'warning', 'Tutti i dati sono stati resettati.');
        }
    };

    /* ==========================================================
       INIT
       ========================================================== */
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

})();
