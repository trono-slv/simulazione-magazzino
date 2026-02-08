(function () {
    'use strict';

    // ============================================================
    // DATA STORE (localStorage)
    // ============================================================
    var STORAGE_KEY = 'magazzino_data_v3';

    function getStore() {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try { return JSON.parse(raw); } catch (e) { /* corrupted */ }
        }
        return {
            articoli: [],
            movCarico: [],
            movScarico: [],
            ddtList: [],
            ordiniList: [],
            ddtCounter: 1,
            ordineCounter: 1,
            artCounter: 7
        };
    }

    function saveStore(store) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }

    // ============================================================
    // DATI DI ESEMPIO (caricati solo se magazzino vuoto)
    // ============================================================
    function initSampleData() {
        var store = getStore();
        if (store.articoli.length > 0) return;

        store.articoli = [
            { codice: 'ART-001', descrizione: 'Monitor LED 24"', categoria: 'Elettronica', um: 'PZ', giacenza: 25, scortaMin: 5, prezzo: 189.90, posizione: 'Scaffale A-1', note: '' },
            { codice: 'ART-002', descrizione: 'Tastiera Meccanica USB', categoria: 'Elettronica', um: 'PZ', giacenza: 42, scortaMin: 10, prezzo: 59.90, posizione: 'Scaffale A-2', note: '' },
            { codice: 'ART-003', descrizione: 'Cacciavite Phillips PH2', categoria: 'Ferramenta', um: 'PZ', giacenza: 3, scortaMin: 10, prezzo: 8.50, posizione: 'Scaffale B-1', note: 'Sotto scorta' },
            { codice: 'ART-004', descrizione: 'Risma Carta A4 500fg', categoria: 'Cancelleria', um: 'CF', giacenza: 120, scortaMin: 20, prezzo: 4.90, posizione: 'Scaffale C-1', note: '' },
            { codice: 'ART-005', descrizione: 'Mouse Wireless Ergonomico', categoria: 'Elettronica', um: 'PZ', giacenza: 0, scortaMin: 5, prezzo: 29.90, posizione: 'Scaffale A-2', note: 'Esaurito' },
            { codice: 'ART-006', descrizione: 'Cavo HDMI 2m', categoria: 'Elettronica', um: 'PZ', giacenza: 67, scortaMin: 15, prezzo: 12.90, posizione: 'Scaffale A-3', note: '' }
        ];
        store.artCounter = 7;
        saveStore(store);
    }

    // ============================================================
    // UTILITY
    // ============================================================
    function oggi() {
        var d = new Date();
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function oraAdesso() {
        var d = new Date();
        return pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function formatData(str) {
        if (!str) return '-';
        var p = str.split('-');
        if (p.length === 3) return p[2] + '/' + p[1] + '/' + p[0];
        return str;
    }

    function formatValuta(n) {
        return '€ ' + (n || 0).toFixed(2).replace('.', ',');
    }

    function generaCodice(prefix, counter) {
        return prefix + ('000' + counter).slice(-3);
    }

    // ============================================================
    // ALERTS
    // ============================================================
    function showAlert(containerId, type, message) {
        var el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
        setTimeout(function () { el.innerHTML = ''; }, 6000);
    }

    // ============================================================
    // HEADER STATS
    // ============================================================
    function updateHeaderStats() {
        var store = getStore();
        var arts = store.articoli;
        var totalGiacenza = 0;
        var totalValore = 0;
        var allarmi = 0;

        for (var i = 0; i < arts.length; i++) {
            totalGiacenza += arts[i].giacenza;
            totalValore += arts[i].giacenza * arts[i].prezzo;
            if (arts[i].giacenza <= arts[i].scortaMin) allarmi++;
        }

        var el1 = document.getElementById('statArticoli');
        var el2 = document.getElementById('statGiacenza');
        var el3 = document.getElementById('statAllarmi');
        var el4 = document.getElementById('statValore');

        if (el1) el1.textContent = arts.length;
        if (el2) el2.textContent = totalGiacenza;
        if (el3) el3.textContent = allarmi;
        if (el4) el4.textContent = '€ ' + totalValore.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    // ============================================================
    // TAB NAVIGATION
    // ============================================================
    window.switchTab = function (tabName) {
        var sections = document.querySelectorAll('.section');
        for (var i = 0; i < sections.length; i++) {
            sections[i].classList.remove('active');
        }

        var tabs = document.querySelectorAll('.nav-tab');
        for (var j = 0; j < tabs.length; j++) {
            tabs[j].classList.remove('active');
        }

        var target = document.getElementById('sec-' + tabName);
        if (target) target.classList.add('active');

        var activeTab = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
        if (activeTab) activeTab.classList.add('active');

        // Popola select e aggiorna tabelle quando si cambia tab
        if (tabName === 'inventario') renderInventario();
        if (tabName === 'carico') { popolaSelectArticoli('caricoArticolo'); renderStoricoCarichi(); impostaDataOggi('caricoData'); }
        if (tabName === 'scarico') { popolaSelectArticoli('scaricoArticolo'); renderStoricoScarichi(); impostaDataOggi('scaricoData'); }
        if (tabName === 'nuovo') generaNuovoCodice();
        if (tabName === 'ddt') { inizializzaDDT(); }
        if (tabName === 'ordini') { inizializzaOrdini(); }
    };

    function impostaDataOggi(id) {
        var el = document.getElementById(id);
        if (el && !el.value) el.value = oggi();
    }

    // ============================================================
    // POPOLA SELECT ARTICOLI
    // ============================================================
    function popolaSelectArticoli(selectId) {
        var store = getStore();
        var sel = document.getElementById(selectId);
        if (!sel) return;

        var current = sel.value;
        sel.innerHTML = '<option value="">-- Seleziona articolo --</option>';

        for (var i = 0; i < store.articoli.length; i++) {
            var a = store.articoli[i];
            var opt = document.createElement('option');
            opt.value = a.codice;
            opt.textContent = a.codice + ' - ' + a.descrizione + ' (Giac: ' + a.giacenza + ' ' + a.um + ')';
            sel.appendChild(opt);
        }

        if (current) sel.value = current;
    }

    // ============================================================
    // STOCK HELPERS
    // ============================================================
    function getStockClass(giacenza, scortaMin) {
        if (giacenza === 0) return 'stock-critical';
        if (giacenza <= scortaMin) return 'stock-low';
        return 'stock-ok';
    }

    function getStockLabel(giacenza, scortaMin) {
        if (giacenza === 0) return 'Esaurito';
        if (giacenza <= scortaMin) return 'Sotto scorta';
        return 'Disponibile';
    }

    // ============================================================
    // INVENTARIO
    // ============================================================
    function renderInventario() {
        var store = getStore();
        var arts = store.articoli;
        var tbody = document.getElementById('inventarioBody');
        if (!tbody) return;

        // Filtri
        var searchEl = document.getElementById('searchInventario');
        var catEl = document.getElementById('filterCategoria');
        var search = searchEl ? searchEl.value.toLowerCase().trim() : '';
        var cat = catEl ? catEl.value : '';

        var filtered = [];
        for (var i = 0; i < arts.length; i++) {
            var a = arts[i];
            var matchSearch = !search ||
                a.codice.toLowerCase().indexOf(search) > -1 ||
                a.descrizione.toLowerCase().indexOf(search) > -1 ||
                (a.posizione && a.posizione.toLowerCase().indexOf(search) > -1);
            var matchCat = !cat || a.categoria === cat;
            if (matchSearch && matchCat) filtered.push(a);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#9aa0a6;">' +
                '<div style="font-size:32px;margin-bottom:8px;">📦</div>Nessun articolo trovato</td></tr>';
            return;
        }

        var html = '';
        for (var j = 0; j < filtered.length; j++) {
            var art = filtered[j];
            var sc = getStockClass(art.giacenza, art.scortaMin);
            var sl = getStockLabel(art.giacenza, art.scortaMin);
            html += '<tr>' +
                '<td><code style="background:#f1f3f4;padding:3px 8px;border-radius:4px;font-size:12px;font-weight:600;">' + art.codice + '</code></td>' +
                '<td><strong>' + art.descrizione + '</strong></td>' +
                '<td><span style="background:#f1f3f4;padding:2px 8px;border-radius:10px;font-size:11px;">' + art.categoria + '</span></td>' +
                '<td class="text-center">' + art.um + '</td>' +
                '<td class="text-right"><strong>' + art.giacenza + '</strong></td>' +
                '<td class="text-center"><span class="stock-badge ' + sc + '">' + sl + '</span></td>' +
                '<td class="text-right">' + formatValuta(art.prezzo) + '</td>' +
                '<td>' + (art.posizione || '-') + '</td>' +
                '<td><div class="actions-cell">' +
                '<button class="btn btn-sm btn-outline" onclick="apriModifica(\'' + art.codice + '\')" title="Modifica">✏️</button>' +
                '<button class="btn btn-sm btn-outline" onclick="apriElimina(\'' + art.codice + '\')" title="Elimina" style="color:#d93025;">🗑️</button>' +
                '</div></td></tr>';
        }
        tbody.innerHTML = html;
    }

    window.filtraInventario = function () {
        renderInventario();
    };

    // ============================================================
    // MODIFICA ARTICOLO (Modal)
    // ============================================================
    window.apriModifica = function (codice) {
        var store = getStore();
        var art = null;
        for (var i = 0; i < store.articoli.length; i++) {
            if (store.articoli[i].codice === codice) { art = store.articoli[i]; break; }
        }
        if (!art) return;

        document.getElementById('editCodice').value = art.codice;
        document.getElementById('editDescrizione').value = art.descrizione;
        document.getElementById('editCategoria').value = art.categoria;
        document.getElementById('editUM').value = art.um;
        document.getElementById('editGiacenza').value = art.giacenza;
        document.getElementById('editScortaMin').value = art.scortaMin;
        document.getElementById('editPrezzo').value = art.prezzo;
        document.getElementById('editPosizione').value = art.posizione || '';
        document.getElementById('editNote').value = art.note || '';

        document.getElementById('modalModifica').classList.add('open');
    };

    window.chiudiModalModifica = function () {
        document.getElementById('modalModifica').classList.remove('open');
    };

    window.salvaModifica = function () {
        var store = getStore();
        var codice = document.getElementById('editCodice').value;
        var idx = -1;
        for (var i = 0; i < store.articoli.length; i++) {
            if (store.articoli[i].codice === codice) { idx = i; break; }
        }
        if (idx === -1) return;

        store.articoli[idx].descrizione = document.getElementById('editDescrizione').value.trim();
        store.articoli[idx].categoria = document.getElementById('editCategoria').value;
        store.articoli[idx].um = document.getElementById('editUM').value;
        store.articoli[idx].giacenza = parseInt(document.getElementById('editGiacenza').value) || 0;
        store.articoli[idx].scortaMin = parseInt(document.getElementById('editScortaMin').value) || 0;
        store.articoli[idx].prezzo = parseFloat(document.getElementById('editPrezzo').value) || 0;
        store.articoli[idx].posizione = document.getElementById('editPosizione').value.trim();
        store.articoli[idx].note = document.getElementById('editNote').value.trim();

        saveStore(store);
        chiudiModalModifica();
        renderInventario();
        updateHeaderStats();
        showAlert('alertInventario', 'success', 'Articolo <strong>' + codice + '</strong> aggiornato con successo!');
    };

    // ============================================================
    // ELIMINA ARTICOLO (Modal)
    // ============================================================
    var codiceElimina = '';

    window.apriElimina = function (codice) {
        var store = getStore();
        var art = null;
        for (var i = 0; i < store.articoli.length; i++) {
            if (store.articoli[i].codice === codice) { art = store.articoli[i]; break; }
        }
        if (!art) return;

        codiceElimina = codice;

        var elCodice = document.getElementById('eliminaCodice');
        var elDesc = document.getElementById('eliminaDescrizione');
        var elGiac = document.getElementById('eliminaGiacenza');

        if (elCodice) elCodice.textContent = art.codice;
        if (elDesc) elDesc.textContent = art.descrizione;
        if (elGiac) elGiac.textContent = art.giacenza + ' ' + art.um;

        document.getElementById('modalElimina').classList.add('open');
    };

    window.chiudiModalElimina = function () {
        document.getElementById('modalElimina').classList.remove('open');
        codiceElimina = '';
    };

    window.confermaElimina = function () {
        if (!codiceElimina) return;
        var store = getStore();
        store.articoli = store.articoli.filter(function (a) { return a.codice !== codiceElimina; });
        saveStore(store);
        chiudiModalElimina();
        renderInventario();
        updateHeaderStats();
        showAlert('alertInventario', 'danger', 'Articolo <strong>' + codiceElimina + '</strong> eliminato.');
    };

    // ============================================================
    // CARICO MERCE
    // ============================================================
    window.registraCarico = function () {
        var codice = document.getElementById('caricoArticolo').value;
        var qta = parseInt(document.getElementById('caricoQta').value);
        var data = document.getElementById('caricoData').value;
        var fornitore = document.getElementById('caricoFornitore').value.trim();
        var documento = document.getElementById('caricoDocumento').value.trim();

        if (!codice) return showAlert('alertCarico', 'danger', 'Seleziona un articolo.');
        if (!qta || qta < 1) return showAlert('alertCarico', 'danger', 'Inserisci una quantità valida.');
        if (!data) return showAlert('alertCarico', 'danger', 'Inserisci la data.');

        var store = getStore();
        var art = null;
        for (var i = 0; i < store.articoli.length; i++) {
            if (store.articoli[i].codice === codice) { art = store.articoli[i]; break; }
        }
        if (!art) return showAlert('alertCarico', 'danger', 'Articolo non trovato.');

        art.giacenza += qta;

        store.movCarico.unshift({
            data: data,
            ora: oraAdesso(),
            codice: codice,
            descrizione: art.descrizione,
            qta: qta,
            fornitore: fornitore,
            documento: documento
        });

        saveStore(store);
        renderStoricoCarichi();
        popolaSelectArticoli('caricoArticolo');
        updateHeaderStats();

        // Reset parziale
        document.getElementById('caricoQta').value = '1';
        document.getElementById('caricoFornitore').value = '';
        document.getElementById('caricoDocumento').value = '';
        document.getElementById('caricoArticolo').value = '';

        showAlert('alertCarico', 'success', 'Caricati <strong>' + qta + '</strong> pezzi di <strong>' + art.descrizione + '</strong>. Nuova giacenza: <strong>' + art.giacenza + '</strong>');
    };

    function renderStoricoCarichi() {
        var store = getStore();
        var tbody = document.getElementById('caricoBody');
        if (!tbody) return;

        if (store.movCarico.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#9aa0a6;">Nessun carico registrato</td></tr>';
            return;
        }

        var html = '';
        for (var i = 0; i < store.movCarico.length; i++) {
            var m = store.movCarico[i];
            html += '<tr>' +
                '<td>' + formatData(m.data) + '</td>' +
                '<td>' + m.ora + '</td>' +
                '<td><code>' + m.codice + '</code></td>' +
                '<td>' + m.descrizione + '</td>' +
                '<td class="text-right" style="color:#0d904f;font-weight:700;">+' + m.qta + '</td>' +
                '<td>' + (m.fornitore || '-') + '</td>' +
                '<td>' + (m.documento || '-') + '</td>' +
                '</tr>';
        }
        tbody.innerHTML = html;
    }

    // ============================================================
    // SCARICO MERCE
    // ============================================================
    window.registraScarico = function () {
        var codice = document.getElementById('scaricoArticolo').value;
        var qta = parseInt(document.getElementById('scaricoQta').value);
        var data = document.getElementById('scaricoData').value;
        var causale = document.getElementById('scaricoCausale').value;
        var destinatario = document.getElementById('scaricoDestinatario').value.trim();
        var documento = document.getElementById('scaricoDocumento').value.trim();

        if (!codice) return showAlert('alertScarico', 'danger', 'Seleziona un articolo.');
        if (!qta || qta < 1) return showAlert('alertScarico', 'danger', 'Inserisci una quantità valida.');
        if (!data) return showAlert('alertScarico', 'danger', 'Inserisci la data.');

        var store = getStore();
        var art = null;
        for (var i = 0; i < store.articoli.length; i++) {
            if (store.articoli[i].codice === codice) { art = store.articoli[i]; break; }
        }
        if (!art) return showAlert('alertScarico', 'danger', 'Articolo non trovato.');

        if (art.giacenza < qta) {
            return showAlert('alertScarico', 'danger', 'Giacenza insufficiente! Disponibili: <strong>' + art.giacenza + ' ' + art.um + '</strong>');
        }

        art.giacenza -= qta;

        store.movScarico.unshift({
            data: data,
            ora: oraAdesso(),
            codice: codice,
            descrizione: art.descrizione,
            qta: qta,
            causale: causale,
            destinatario: destinatario,
            documento: documento
        });

        saveStore(store);
        renderStoricoScarichi();
        popolaSelectArticoli('scaricoArticolo');
        updateHeaderStats();

        document.getElementById('scaricoQta').value = '1';
        document.getElementById('scaricoDestinatario').value = '';
        document.getElementById('scaricoDocumento').value = '';
        document.getElementById('scaricoArticolo').value = '';

        showAlert('alertScarico', 'success', 'Scaricati <strong>' + qta + '</strong> pezzi di <strong>' + art.descrizione + '</strong>. Nuova giacenza: <strong>' + art.giacenza + '</strong>');
    };

    function renderStoricoScarichi() {
        var store = getStore();
        var tbody = document.getElementById('scaricoBody');
        if (!tbody) return;

        if (store.movScarico.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#9aa0a6;">Nessuno scarico registrato</td></tr>';
            return;
        }

        var html = '';
        for (var i = 0; i < store.movScarico.length; i++) {
            var m = store.movScarico[i];
            html += '<tr>' +
                '<td>' + formatData(m.data) + '</td>' +
                '<td>' + m.ora + '</td>' +
                '<td><code>' + m.codice + '</code></td>' +
                '<td>' + m.descrizione + '</td>' +
                '<td class="text-right" style="color:#d93025;font-weight:700;">-' + m.qta + '</td>' +
                '<td>' + m.causale + '</td>' +
                '<td>' + (m.destinatario || '-') + '</td>' +
                '<td>' + (m.documento || '-') + '</td>' +
                '</tr>';
        }
        tbody.innerHTML = html;
    }

    // ============================================================
    // NUOVO ARTICOLO
    // ============================================================
    function generaNuovoCodice() {
        var store = getStore();
        var cod = generaCodice('ART-', store.artCounter);
        var el = document.getElementById('nuovoCodice');
        if (el) el.value = cod;
    }

    window.creaNuovoArticolo = function () {
        var codice = document.getElementById('nuovoCodice').value;
        var descrizione = document.getElementById('nuovoDescrizione').value.trim();
        var categoria = document.getElementById('nuovoCategoria').value;
        var um = document.getElementById('nuovoUM').value;
        var giacenza = parseInt(document.getElementById('nuovoGiacenza').value) || 0;
        var scortaMin = parseInt(document.getElementById('nuovoScortaMin').value) || 0;
        var prezzo = parseFloat(document.getElementById('nuovoPrezzo').value) || 0;
        var posizione = document.getElementById('nuovoPosizione').value.trim();
        var note = document.getElementById('nuovoNote').value.trim();

        if (!descrizione) return showAlert('alertNuovo', 'danger', 'Inserisci la descrizione dell\'articolo.');
        if (!categoria) return showAlert('alertNuovo', 'danger', 'Seleziona una categoria.');

        var store = getStore();

        // Verifica duplicato
        for (var i = 0; i < store.articoli.length; i++) {
            if (store.articoli[i].codice === codice) {
                return showAlert('alertNuovo', 'danger', 'Codice articolo già esistente!');
            }
        }

        store.articoli.push({
            codice: codice,
            descrizione: descrizione,
            categoria: categoria,
            um: um,
            giacenza: giacenza,
            scortaMin: scortaMin,
            prezzo: prezzo,
            posizione: posizione,
            note: note
        });

        store.artCounter++;
        saveStore(store);
        updateHeaderStats();

        showAlert('alertNuovo', 'success', 'Articolo <strong>' + codice + ' - ' + descrizione + '</strong> creato con successo!');

        // Reset form
        resetFormNuovo();
    };

    window.resetFormNuovo = function () {
        document.getElementById('nuovoDescrizione').value = '';
        document.getElementById('nuovoCategoria').value = '';
        document.getElementById('nuovoUM').value = 'PZ';
        document.getElementById('nuovoGiacenza').value = '0';
        document.getElementById('nuovoScortaMin').value = '5';
        document.getElementById('nuovoPrezzo').value = '0';
        document.getElementById('nuovoPosizione').value = '';
        document.getElementById('nuovoNote').value = '';
        generaNuovoCodice();
    };

    // ============================================================
    // DDT — DOCUMENTI DI TRASPORTO
    // ============================================================
    var ddtRighe = [];

    function inizializzaDDT() {
        var store = getStore();
        var numEl = document.getElementById('ddtNumero');
        if (numEl) numEl.value = 'DDT-' + oggi().replace(/-/g, '') + '-' + ('000' + store.ddtCounter).slice(-3);

        var dataEl = document.getElementById('ddtData');
        if (dataEl && !dataEl.value) dataEl.value = oggi();

        popolaSelectArticoli('ddtArticoloSel');
        renderDDTRighe();
        renderDDTList();
    }

    window.aggiungiRigaDDT = function () {
        var sel = document.getElementById('ddtArticoloSel');
        var qtaEl = document.getElementById('ddtArticoloQta');
        var codice = sel ? sel.value : '';
        var qta = parseInt(qtaEl ? qtaEl.value : 0);

        if (!codice) return showAlert('alertDDT', 'danger', 'Seleziona un articolo.');
        if (!qta || qta < 1) return showAlert('alertDDT', 'danger', 'Quantità non valida.');

        var store = getStore();
        var art = null;
        for (var i = 0; i < store.articoli.length; i++) {
            if (store.articoli[i].codice === codice) { art = store.articoli[i]; break; }
        }
        if (!art) return;

        // Controlla se già in lista
        for (var k = 0; k < ddtRighe.length; k++) {
            if (ddtRighe[k].codice === codice) {
                ddtRighe[k].qta += qta;
                renderDDTRighe();
                if (qtaEl) qtaEl.value = '1';
                return;
            }
        }

        ddtRighe.push({
            codice: art.codice,
            descrizione: art.descrizione,
            um: art.um,
            qta: qta,
            prezzo: art.prezzo
        });

        renderDDTRighe();
        if (qtaEl) qtaEl.value = '1';
    };

    window.rimuoviRigaDDT = function (idx) {
        ddtRighe.splice(idx, 1);
        renderDDTRighe();
    };

    function renderDDTRighe() {
        var tbody = document.getElementById('ddtRigheBody');
        if (!tbody) return;

        if (ddtRighe.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9aa0a6;">Aggiungi articoli al DDT</td></tr>';
            return;
        }

        var html = '';
        var totale = 0;
        for (var i = 0; i < ddtRighe.length; i++) {
            var r = ddtRighe[i];
            var sub = r.qta * r.prezzo;
            totale += sub;
            html += '<tr>' +
                '<td><code>' + r.codice + '</code></td>' +
                '<td>' + r.descrizione + '</td>' +
                '<td class="text-center">' + r.um + '</td>' +
                '<td class="text-right">' + r.qta + '</td>' +
                '<td class="text-right">' + formatValuta(r.prezzo) + '</td>' +
                '<td class="text-center"><button class="btn btn-sm btn-outline" onclick="rimuoviRigaDDT(' + i + ')" style="color:#d93025;">✕</button></td>' +
                '</tr>';
        }
        tbody.innerHTML = html;

        var totEl = document.getElementById('ddtTotale');
        if (totEl) totEl.innerHTML = 'Totale DDT: <strong>' + formatValuta(totale) + '</strong>';
    }

    window.emettiDDT = function () {
        var destinatario = document.getElementById('ddtDestinatario').value.trim();
        var numero = document.getElementById('ddtNumero').value;
        var data = document.getElementById('ddtData').value;
        var indirizzo = document.getElementById('ddtIndirizzo').value.trim();
        var causale = document.getElementById('ddtCausale').value;
        var trasporto = document.getElementById('ddtTrasporto').value;
        var note = document.getElementById('ddtNote').value.trim();

        if (!destinatario) return showAlert('alertDDT', 'danger', 'Inserisci il destinatario.');
        if (!data) return showAlert('alertDDT', 'danger', 'Inserisci la data.');
        if (ddtRighe.length === 0) return showAlert('alertDDT', 'danger', 'Aggiungi almeno un articolo.');

        var store = getStore();

        // Verifica giacenze
        for (var i = 0; i < ddtRighe.length; i++) {
            var r = ddtRighe[i];
            var art = null;
            for (var j = 0; j < store.articoli.length; j++) {
                if (store.articoli[j].codice === r.codice) { art = store.articoli[j]; break; }
            }
            if (!art) return showAlert('alertDDT', 'danger', 'Articolo ' + r.codice + ' non trovato.');
            if (art.giacenza < r.qta) {
                return showAlert('alertDDT', 'danger', 'Giacenza insufficiente per <strong>' + r.descrizione + '</strong>. Disponibili: ' + art.giacenza);
            }
        }

        // Scarica giacenze e registra movimenti di scarico
        for (var k = 0; k < ddtRighe.length; k++) {
            var riga = ddtRighe[k];
            for (var m = 0; m < store.articoli.length; m++) {
                if (store.articoli[m].codice === riga.codice) {
                    store.articoli[m].giacenza -= riga.qta;
                    break;
                }
            }
            store.movScarico.unshift({
                data: data,
                ora: oraAdesso(),
                codice: riga.codice,
                descrizione: riga.descrizione,
                qta: riga.qta,
                causale: 'DDT - ' + causale,
                destinatario: destinatario,
                documento: numero
            });
        }

        // Salva DDT
        var totale = 0;
        var righeClone = [];
        for (var n = 0; n < ddtRighe.length; n++) {
            totale += ddtRighe[n].qta * ddtRighe[n].prezzo;
            righeClone.push({
                codice: ddtRighe[n].codice,
                descrizione: ddtRighe[n].descrizione,
                um: ddtRighe[n].um,
                qta: ddtRighe[n].qta,
                prezzo: ddtRighe[n].prezzo
            });
        }

        store.ddtList.unshift({
            numero: numero,
            data: data,
            destinatario: destinatario,
            indirizzo: indirizzo,
            causale: causale,
            trasporto: trasporto,
            note: note,
            righe: righeClone,
            totale: totale
        });

        store.ddtCounter++;
        saveStore(store);
        updateHeaderStats();

        showAlert('alertDDT', 'success', 'DDT <strong>' + numero + '</strong> emesso con successo!');

        // Reset
        ddtRighe = [];
        resetFormDDT();
    };

    window.resetFormDDT = function () {
        document.getElementById('ddtDestinatario').value = '';
        document.getElementById('ddtIndirizzo').value = '';
        document.getElementById('ddtCausale').value = 'Vendita';
        document.getElementById('ddtTrasporto').value = 'Mittente';
        document.getElementById('ddtNote').value = '';
        ddtRighe = [];
        inizializzaDDT();
    };

    function renderDDTList() {
        var store = getStore();
        var tbody = document.getElementById('ddtListBody');
        var emptyEl = document.getElementById('emptyDDT');
        if (!tbody) return;

        if (store.ddtList.length === 0) {
            tbody.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        var html = '';
        for (var i = 0; i < store.ddtList.length; i++) {
            var d = store.ddtList[i];
            html += '<tr>' +
                '<td><strong>' + d.numero + '</strong></td>' +
                '<td>' + formatData(d.data) + '</td>' +
                '<td>' + d.destinatario + '</td>' +
                '<td class="text-center">' + d.righe.length + '</td>' +
                '<td>' + d.causale + '</td>' +
                '<td class="text-center"><button class="btn btn-sm btn-primary" onclick="anteprimaDDT(' + i + ')">👁️ Vedi</button></td>' +
                '</tr>';
        }
        tbody.innerHTML = html;
    }

    // ============================================================
    // DDT — ANTEPRIMA E STAMPA
    // ============================================================
    window.anteprimaDDT = function (idx) {
        var store = getStore();
        var d = store.ddtList[idx];
        if (!d) return;

        var righeHtml = '';
        var totale = 0;
        for (var i = 0; i < d.righe.length; i++) {
            var r = d.righe[i];
            var sub = r.qta * r.prezzo;
            totale += sub;
            righeHtml += '<tr>' +
                '<td>' + r.codice + '</td>' +
                '<td>' + r.descrizione + '</td>' +
                '<td style="text-align:center;">' + r.um + '</td>' +
                '<td style="text-align:right;">' + r.qta + '</td>' +
                '<td style="text-align:right;">' + formatValuta(r.prezzo) + '</td>' +
                '<td style="text-align:right;">' + formatValuta(sub) + '</td>' +
                '</tr>';
        }

        var html = '<div style="font-family:Arial,sans-serif;font-size:14px;">' +
            '<div style="display:flex;justify-content:space-between;border-bottom:3px solid #1a73e8;padding-bottom:16px;margin-bottom:16px;">' +
            '<div><strong style="font-size:20px;">DOCUMENTO DI TRASPORTO</strong><br>' + d.numero + '</div>' +
            '<div style="text-align:right;">Data: <strong>' + formatData(d.data) + '</strong></div></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">' +
            '<div style="background:#f8f9fa;padding:12px;border-radius:8px;"><strong>Destinatario:</strong><br>' + d.destinatario + '<br>' + (d.indirizzo || '') + '</div>' +
            '<div style="background:#f8f9fa;padding:12px;border-radius:8px;"><strong>Causale:</strong> ' + d.causale + '<br><strong>Trasporto:</strong> ' + d.trasporto + '</div></div>' +
            '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">' +
            '<thead><tr style="background:#1a73e8;color:white;">' +
            '<th style="padding:8px;text-align:left;">Codice</th><th style="padding:8px;text-align:left;">Descrizione</th>' +
            '<th style="padding:8px;text-align:center;">U.M.</th><th style="padding:8px;text-align:right;">Qtà</th>' +
            '<th style="padding:8px;text-align:right;">Prezzo</th><th style="padding:8px;text-align:right;">Totale</th></tr></thead>' +
            '<tbody>' + righeHtml + '</tbody></table>' +
            '<div style="text-align:right;font-size:16px;font-weight:bold;padding:10px;background:#e8f0fe;border-radius:8px;">TOTALE: ' + formatValuta(totale) + '</div>';

        if (d.note) {
            html += '<div style="margin-top:16px;padding:10px;border:1px solid #dadce0;border-radius:8px;"><strong>Note:</strong> ' + d.note + '</div>';
        }

        html += '<div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center;">' +
            '<div style="border-top:1px solid #000;padding-top:8px;">Firma Mittente</div>' +
            '<div style="border-top:1px solid #000;padding-top:8px;">Firma Vettore</div>' +
            '<div style="border-top:1px solid #000;padding-top:8px;">Firma Destinatario</div></div></div>';

        document.getElementById('ddtPreviewBody').innerHTML = html;
        document.getElementById('modalDDTPreview').classList.add('open');
    };

    window.chiudiModalDDT = function () {
        document.getElementById('modalDDTPreview').classList.remove('open');
    };

    window.stampaDDT = function () {
        var content = document.getElementById('ddtPreviewBody').innerHTML;
        var win = window.open('', '_blank', 'width=800,height=600');
        win.document.write('<html><head><title>Stampa DDT</title>' +
            '<style>body{font-family:Arial,sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;} th,td{padding:8px;border:1px solid #ddd;} @media print{body{padding:0;}}</style>' +
            '</head><body>' + content + '</body></html>');
        win.document.close();
        win.focus();
        setTimeout(function () { win.print(); }, 500);
    };

    // ============================================================
    // ORDINI
    // ============================================================
    var ordineRighe = [];

    function inizializzaOrdini() {
        var store = getStore();
        var numEl = document.getElementById('ordineNumero');
        if (numEl) numEl.value = 'ORD-' + oggi().replace(/-/g, '') + '-' + ('000' + store.ordineCounter).slice(-3);

        var dataEl = document.getElementById('ordineData');
        if (dataEl && !dataEl.value) dataEl.value = oggi();

        popolaSelectArticoli('ordineArticoloSel');
        renderOrdineRighe();
        renderOrdiniList();
    }

    window.aggiungiRigaOrdine = function () {
        var sel = document.getElementById('ordineArticoloSel');
        var qtaEl = document.getElementById('ordineArticoloQta');
        var codice = sel ? sel.value : '';
        var qta = parseInt(qtaEl ? qtaEl.value : 0);

        if (!codice) return showAlert('alertOrdini', 'danger', 'Seleziona un articolo.');
        if (!qta || qta < 1) return showAlert('alertOrdini', 'danger', 'Quantità non valida.');

        var store = getStore();
        var art = null;
        for (var i = 0; i < store.articoli.length; i++) {
            if (store.articoli[i].codice === codice) { art = store.articoli[i]; break; }
        }
        if (!art) return;

        // Controlla se già in lista
        for (var k = 0; k < ordineRighe.length; k++) {
            if (ordineRighe[k].codice === codice) {
                ordineRighe[k].qta += qta;
                renderOrdineRighe();
                if (qtaEl) qtaEl.value = '1';
                return;
            }
        }

        ordineRighe.push({
            codice: art.codice,
            descrizione: art.descrizione,
            um: art.um,
            qta: qta,
            prezzo: art.prezzo
        });

        renderOrdineRighe();
        if (qtaEl) qtaEl.value = '1';
    };

    window.rimuoviRigaOrdine = function (idx) {
        ordineRighe.splice(idx, 1);
        renderOrdineRighe();
    };

    function renderOrdineRighe() {
        var tbody = document.getElementById('ordineRigheBody');
        if (!tbody) return;

        if (ordineRighe.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9aa0a6;">Aggiungi articoli all\'ordine</td></tr>';
            var totEl = document.getElementById('ordineTotale');
            if (totEl) totEl.innerHTML = 'Totale Ordine: <strong>' + formatValuta(0) + '</strong>';
            return;
        }

        var html = '';
        var totale = 0;
        for (var i = 0; i < ordineRighe.length; i++) {
            var r = ordineRighe[i];
            var sub = r.qta * r.prezzo;
            totale += sub;
            html += '<tr>' +
                '<td><code>' + r.codice + '</code></td>' +
                '<td>' + r.descrizione + '</td>' +
                '<td class="text-center">' + r.um + '</td>' +
                '<td class="text-right">' + r.qta + '</td>' +
                '<td class="text-right">' + formatValuta(sub) + '</td>' +
                '<td class="text-center"><button class="btn btn-sm btn-outline" onclick="rimuoviRigaOrdine(' + i + ')" style="color:#d93025;">✕</button></td>' +
                '</tr>';
        }
        tbody.innerHTML = html;

        var totEl = document.getElementById('ordineTotale');
        if (totEl) totEl.innerHTML = 'Totale Ordine: <strong>' + formatValuta(totale) + '</strong>';
    }

    window.emettiOrdine = function () {
        var numero = document.getElementById('ordineNumero').value;
        var data = document.getElementById('ordineData').value;
        var fornitore = document.getElementById('ordineFornitore').value.trim();
        var tipo = document.getElementById('ordineTipo').value;
        var note = document.getElementById('ordineNote').value.trim();

        if (!fornitore) return showAlert('alertOrdini', 'danger', 'Inserisci fornitore / cliente.');
        if (!data) return showAlert('alertOrdini', 'danger', 'Inserisci la data.');
        if (ordineRighe.length === 0) return showAlert('alertOrdini', 'danger', 'Aggiungi almeno un articolo.');

        var store = getStore();

        var totale = 0;
        var righeClone = [];
        for (var i = 0; i < ordineRighe.length; i++) {
            totale += ordineRighe[i].qta * ordineRighe[i].prezzo;
            righeClone.push({
                codice: ordineRighe[i].codice,
                descrizione: ordineRighe[i].descrizione,
                um: ordineRighe[i].um,
                qta: ordineRighe[i].qta,
                prezzo: ordineRighe[i].prezzo
            });
        }

        store.ordiniList.unshift({
            numero: numero,
            data: data,
            fornitore: fornitore,
            tipo: tipo,
            note: note,
            righe: righeClone,
            totale: totale,
            stato: 'In attesa'
        });

        store.ordineCounter++;
        saveStore(store);

        showAlert('alertOrdini', 'success', 'Ordine <strong>' + numero + '</strong> (' + tipo + ') emesso con successo!');

        ordineRighe = [];
        resetFormOrdine();
    };

    window.resetFormOrdine = function () {
        document.getElementById('ordineFornitore').value = '';
        document.getElementById('ordineTipo').value = 'Acquisto';
        document.getElementById('ordineNote').value = '';
        ordineRighe = [];
        inizializzaOrdini();
    };

    function renderOrdiniList() {
        var store = getStore();
        var tbody = document.getElementById('ordiniListBody');
        var emptyEl = document.getElementById('emptyOrdini');
        if (!tbody) return;

        if (store.ordiniList.length === 0) {
            tbody.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        var html = '';
        for (var i = 0; i < store.ordiniList.length; i++) {
            var o = store.ordiniList[i];
            var statusClass = getStatusClass(o.stato);
            var azioniHtml = buildOrdineActions(i, o.stato, o.tipo);

            html += '<tr>' +
                '<td><strong>' + o.numero + '</strong></td>' +
                '<td>' + formatData(o.data) + '</td>' +
                '<td>' + o.tipo + '</td>' +
                '<td>' + o.fornitore + '</td>' +
                '<td class="text-center">' + o.righe.length + '</td>' +
                '<td class="text-right">' + formatValuta(o.totale) + '</td>' +
                '<td class="text-center"><span class="status-badge ' + statusClass + '">' + o.stato + '</span></td>' +
                '<td class="text-center">' + azioniHtml + '</td>' +
                '</tr>';
        }
        tbody.innerHTML = html;
    }

    function getStatusClass(stato) {
        switch (stato) {
            case 'In attesa': return 'status-pending';
            case 'Confermato': return 'status-confirmed';
            case 'Spedito': return 'status-shipped';
            case 'Consegnato': return 'status-delivered';
            case 'Annullato': return 'status-cancelled';
            default: return '';
        }
    }

    function buildOrdineActions(idx, stato, tipo) {
        if (stato === 'Annullato' || stato === 'Consegnato') return '-';

        var btns = '';
        if (stato === 'In attesa') {
            btns += '<button class="btn btn-sm btn-primary" onclick="cambiaStatoOrdine(' + idx + ',\'Confermato\')" title="Conferma">✔️</button> ';
            btns += '<button class="btn btn-sm btn-outline" onclick="cambiaStatoOrdine(' + idx + ',\'Annullato\')" title="Annulla" style="color:#d93025;">✕</button>';
        } else if (stato === 'Confermato') {
            btns += '<button class="btn btn-sm btn-warning" onclick="cambiaStatoOrdine(' + idx + ',\'Spedito\')" title="Spedito">📦</button>';
        } else if (stato === 'Spedito') {
            btns += '<button class="btn btn-sm btn-success" onclick="cambiaStatoOrdine(' + idx + ',\'Consegnato\')" title="Consegnato">✅</button>';
        }
        return btns;
    }

    window.cambiaStatoOrdine = function (idx, nuovoStato) {
        var store = getStore();
        if (idx < 0 || idx >= store.ordiniList.length) return;

        store.ordiniList[idx].stato = nuovoStato;

        // Se è un ordine di acquisto e diventa "Consegnato", carica la merce in magazzino
        if (nuovoStato === 'Consegnato' && store.ordiniList[idx].tipo === 'Acquisto') {
            var ordine = store.ordiniList[idx];
            for (var i = 0; i < ordine.righe.length; i++) {
                var riga = ordine.righe[i];
                for (var j = 0; j < store.articoli.length; j++) {
                    if (store.articoli[j].codice === riga.codice) {
                        store.articoli[j].giacenza += riga.qta;
                        break;
                    }
                }
                store.movCarico.unshift({
                    data: oggi(),
                    ora: oraAdesso(),
                    codice: riga.codice,
                    descrizione: riga.descrizione,
                    qta: riga.qta,
                    fornitore: ordine.fornitore,
                    documento: ordine.numero
                });
            }
            showAlert('alertOrdini', 'success', 'Ordine <strong>' + ordine.numero + '</strong> consegnato. Merce caricata in magazzino!');
        } else if (nuovoStato === 'Consegnato' && store.ordiniList[idx].tipo === 'Vendita') {
            // Ordine di vendita consegnato: scarica merce
            var ordineV = store.ordiniList[idx];
            for (var k = 0; k < ordineV.righe.length; k++) {
                var rigaV = ordineV.righe[k];
                for (var m = 0; m < store.articoli.length; m++) {
                    if (store.articoli[m].codice === rigaV.codice) {
                        store.articoli[m].giacenza -= rigaV.qta;
                        if (store.articoli[m].giacenza < 0) store.articoli[m].giacenza = 0;
                        break;
                    }
                }
                store.movScarico.unshift({
                    data: oggi(),
                    ora: oraAdesso(),
                    codice: rigaV.codice,
                    descrizione: rigaV.descrizione,
                    qta: rigaV.qta,
                    causale: 'Ordine vendita',
                    destinatario: ordineV.fornitore,
                    documento: ordineV.numero
                });
            }
            showAlert('alertOrdini', 'success', 'Ordine vendita <strong>' + ordineV.numero + '</strong> consegnato. Merce scaricata dal magazzino!');
        } else {
            showAlert('alertOrdini', 'info', 'Ordine <strong>' + store.ordiniList[idx].numero + '</strong> aggiornato a: <strong>' + nuovoStato + '</strong>');
        }

        saveStore(store);
        updateHeaderStats();
        renderOrdiniList();
    };

    // ============================================================
    // RESET TUTTI I DATI
    // ============================================================
    window.resetTuttoDati = function () {
        if (confirm('ATTENZIONE: Vuoi davvero cancellare TUTTI i dati del magazzino?\n\nQuesta azione è irreversibile!')) {
            localStorage.removeItem(STORAGE_KEY);
            initSampleData();
            updateHeaderStats();
            switchTab('inventario');
            showAlert('alertInventario', 'warning', 'Tutti i dati sono stati resettati. Dati di esempio ricaricati.');
        }
    };

    // ============================================================
    // INIT (avvio dell'applicazione)
    // ============================================================
    function init() {
        initSampleData();
        updateHeaderStats();
        renderInventario();
    }

    // Avvio al caricamento della pagina
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
