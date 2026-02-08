/* ============================================
   GESTIONE MAGAZZINO — JAVASCRIPT COMPLETO
   ============================================ */
(function () {
    'use strict';

    // ========================================================
    // DATA STORE
    // ========================================================
    var STORAGE_KEY = 'magazzino_data_v3';

    function getStore() {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try { return JSON.parse(raw); } catch (e) { /* corrupted, reset */ }
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

    // ========================================================
    // DATI DI ESEMPIO
    // ========================================================
    function initSampleData() {
        var store = getStore();
        if (store.articoli.length === 0) {
            store.articoli = [
                { codice: 'ART-001', descrizione: 'Monitor LED 24"', categoria: 'Elettronica', um: 'PZ', giacenza: 25, scortaMin: 5, prezzo: 189.90, posizione: 'Scaffale A-1', note: '' },
                { codice: 'ART-002', descrizione: 'Tastiera Meccanica USB', categoria: 'Elettronica', um: 'PZ', giacenza: 50, scortaMin: 10, prezzo: 49.90, posizione: 'Scaffale A-2', note: '' },
                { codice: 'ART-003', descrizione: 'Mouse Wireless', categoria: 'Elettronica', um: 'PZ', giacenza: 3, scortaMin: 10, prezzo: 29.90, posizione: 'Scaffale A-3', note: 'Scorta critica' },
                { codice: 'ART-004', descrizione: 'Cavo HDMI 2m', categoria: 'Elettronica', um: 'PZ', giacenza: 120, scortaMin: 20, prezzo: 8.50, posizione: 'Scaffale B-1', note: '' },
                { codice: 'ART-005', descrizione: 'Risma Carta A4 500ff', categoria: 'Cancelleria', um: 'CF', giacenza: 8, scortaMin: 10, prezzo: 4.90, posizione: 'Scaffale C-1', note: '' },
                { codice: 'ART-006', descrizione: 'Viti M6x20 (conf. 100pz)', categoria: 'Ferramenta', um: 'CF', giacenza: 45, scortaMin: 10, prezzo: 6.50, posizione: 'Scaffale D-2', note: '' }
            ];
            store.artCounter = 7;
            saveStore(store);
        }
        return store;
    }

    // ========================================================
    // UTILITY
    // ========================================================
    function oggi() {
        return new Date().toISOString().split('T')[0];
    }

    function oraAdesso() {
        return new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }

    function formatValuta(n) {
        return Number(n).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
    }

    function formatData(d) {
        if (!d) return '-';
        var parts = d.split('-');
        if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
        return d;
    }

    function generaCodice(prefix, counter) {
        return prefix + String(counter).padStart(3, '0');
    }

    function showAlert(containerId, type, message) {
        var icons = { success: '✅', danger: '❌', warning: '⚠️', info: 'ℹ️' };
        var el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = '<div class="alert alert-' + type + '">' + (icons[type] || '') + ' ' + message + '</div>';
        setTimeout(function () { el.innerHTML = ''; }, 5000);
    }

    function getStockClass(giacenza, scortaMin) {
        if (giacenza <= 0) return 'stock-critical';
        if (giacenza <= scortaMin) return 'stock-low';
        return 'stock-ok';
    }

    function getStockLabel(giacenza, scortaMin) {
        if (giacenza <= 0) return 'Esaurito';
        if (giacenza <= scortaMin) return 'Basso';
        return 'OK';
    }

    function populateArticoloSelect(selectId) {
        var store = getStore();
        var sel = document.getElementById(selectId);
        if (!sel) return;
        var currentVal = sel.value;
        sel.innerHTML = '<option value="">-- Seleziona articolo --</option>';
        store.articoli.forEach(function (a) {
            var opt = document.createElement('option');
            opt.value = a.codice;
            opt.textContent = a.codice + ' — ' + a.descrizione + ' (giac. ' + a.giacenza + ' ' + a.um + ')';
            sel.appendChild(opt);
        });
        sel.value = currentVal;
    }

    // ========================================================
    // NAVIGAZIONE TAB
    // ========================================================
    window.switchTab = function (tabName) {
        document.querySelectorAll('.nav-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });

        var tab = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
        var sec = document.getElementById('sec-' + tabName);
        if (tab) tab.classList.add('active');
        if (sec) sec.classList.add('active');

        switch (tabName) {
            case 'inventario': renderInventario(); break;
            case 'carico': renderCarico(); break;
            case 'scarico': renderScarico(); break;
            case 'nuovo': prepareNuovoArticolo(); break;
            case 'ddt': prepareDDT(); break;
            case 'ordini': prepareOrdini(); break;
        }
        updateHeaderStats();
    };

    // ========================================================
    // HEADER STATS
    // ========================================================
    function updateHeaderStats() {
        var store = getStore();
        var totArticoli = store.articoli.length;
        var totGiacenza = store.articoli.reduce(function (s, a) { return s + (a.giacenza || 0); }, 0);
        var totAllarmi = store.articoli.filter(function (a) { return a.giacenza <= a.scortaMin; }).length;
        var valoreMag = store.articoli.reduce(function (s, a) { return s + (a.giacenza * a.prezzo); }, 0);

        var e1 = document.getElementById('statArticoli');
        var e2 = document.getElementById('statGiacenza');
        var e3 = document.getElementById('statAllarmi');
        var e4 = document.getElementById('statValore');
        if (e1) e1.textContent = totArticoli;
        if (e2) e2.textContent = totGiacenza;
        if (e3) e3.textContent = totAllarmi;
        if (e4) e4.textContent = formatValuta(valoreMag);
    }

    // ========================================================
    // INVENTARIO
    // ========================================================
    function renderInventario() {
        var store = getStore();
        var tbody = document.getElementById('inventarioBody');
        if (!tbody) return;

        var arts = store.articoli.slice();
        var searchEl = document.getElementById('searchInventario');
        var filterEl = document.getElementById('filterCategoria');
        var searchTerm = searchEl ? searchEl.value.toLowerCase().trim() : '';
        var filterCat = filterEl ? filterEl.value : '';

        if (searchTerm) {
            arts = arts.filter(function (a) {
                return a.codice.toLowerCase().indexOf(searchTerm) !== -1 ||
                    a.descrizione.toLowerCase().indexOf(searchTerm) !== -1 ||
                    (a.posizione || '').toLowerCase().indexOf(searchTerm) !== -1;
            });
        }
        if (filterCat) {
            arts = arts.filter(function (a) { return a.categoria === filterCat; });
        }

        if (arts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--gray-500);">' +
                '<div style="font-size:32px;margin-bottom:8px;">📦</div>Nessun articolo trovato</td></tr>';
            return;
        }

        tbody.innerHTML = arts.map(function (a) {
            var sc = getStockClass(a.giacenza, a.scortaMin);
            var sl = getStockLabel(a.giacenza, a.scortaMin);
            return '<tr>' +
                '<td><code style="background:var(--gray-100);padding:3px 8px;border-radius:4px;font-size:12px;font-weight:600;">' + a.codice + '</code></td>' +
                '<td><strong>' + a.descrizione + '</strong></td>' +
                '<td><span style="background:var(--gray-100);padding:2px 8px;border-radius:10px;font-size:11px;">' + a.categoria + '</span></td>' +
                '<td class="text-center">' + a.um + '</td>' +
                '<td class="text-right"><strong>' + a.giacenza + '</strong></td>' +
                '<td class="text-center"><span class="stock-badge ' + sc + '">' + sl + '</span></td>' +
                '<td class="text-right">' + formatValuta(a.prezzo) + '</td>' +
                '<td>' + (a.posizione || '-') + '</td>' +
                '<td><div class="actions-cell">' +
                '<button class="btn btn-sm btn-outline" onclick="apriModifica(\'' + a.codice + '\')" title="Modifica">✏️</button>' +
                '<button class="btn btn-sm btn-outline" onclick="apriElimina(\'' + a.codice + '\')" title="Elimina" style="color:var(--danger);">🗑️</button>' +
                '</div></td></tr>';
        }).join('');
    }
    window.filtraInventario = function () { renderInventario(); };
        // ========================================================
    // MODIFICA ARTICOLO (Modal)
    // ========================================================
    window.apriModifica = function (codice) {
        var store = getStore();
        var art = store.articoli.find(function (a) { return a.codice === codice; });
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
        var idx = store.articoli.findIndex(function (a) { return a.codice === codice; });
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
        showAlert('alertModifica', 'success', 'Articolo <strong>' + codice + '</strong> aggiornato con successo!');
    };

    // ========================================================
    // ELIMINA ARTICOLO (Modal)
    // ========================================================
    window.apriElimina = function (codice) {
        var store = getStore();
        var art = store.articoli.find(function (a) { return a.codice === codice; });
        if (!art) return;

        document.getElementById('eliminaCodice').textContent = art.codice;
        document.getElementById('eliminaDescrizione').textContent = art.descrizione;
        document.getElementById('eliminaGiacenza').textContent = art.giacenza + ' ' + art.um;
        document.getElementById('eliminaCodiceHidden').value = art.codice;

        document.getElementById('modalElimina').classList.add('open');
    };

    window.chiudiModalElimina = function () {
        document.getElementById('modalElimina').classList.remove('open');
    };

    window.confermaElimina = function () {
        var store = getStore();
        var codice = document.getElementById('eliminaCodiceHidden').value;
        store.articoli = store.articoli.filter(function (a) { return a.codice !== codice; });
        saveStore(store);
        chiudiModalElimina();
        renderInventario();
        updateHeaderStats();
    };

    // ========================================================
    // CARICO MERCE
    // ========================================================
    function renderCarico() {
        populateArticoloSelect('caricoArticolo');
        var dataEl = document.getElementById('caricoData');
        if (dataEl && !dataEl.value) dataEl.value = oggi();
        renderStoricoCarico();
    }

    function renderStoricoCarico() {
        var store = getStore();
        var tbody = document.getElementById('caricoBody');
        if (!tbody) return;

        if (store.movCarico.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:30px;color:var(--gray-500);">' +
                '<div style="font-size:28px;margin-bottom:6px;">📥</div>Nessun movimento di carico registrato</td></tr>';
            return;
        }

        tbody.innerHTML = store.movCarico.slice().reverse().map(function (m) {
            return '<tr>' +
                '<td>' + formatData(m.data) + '</td>' +
                '<td>' + (m.ora || '-') + '</td>' +
                '<td><code style="background:var(--gray-100);padding:2px 6px;border-radius:4px;font-size:11px;">' + m.codice + '</code></td>' +
                '<td>' + m.descrizione + '</td>' +
                '<td class="text-right"><strong style="color:var(--success);">+' + m.qta + '</strong></td>' +
                '<td>' + (m.fornitore || '-') + '</td>' +
                '<td>' + (m.documento || '-') + '</td>' +
                '</tr>';
        }).join('');
    }

    window.registraCarico = function () {
        var store = getStore();
        var codice = document.getElementById('caricoArticolo').value;
        var qta = parseInt(document.getElementById('caricoQta').value);
        var data = document.getElementById('caricoData').value;
        var fornitore = document.getElementById('caricoFornitore').value.trim();
        var documento = document.getElementById('caricoDocumento').value.trim();

        if (!codice) { showAlert('alertCarico', 'danger', 'Seleziona un articolo.'); return; }
        if (!qta || qta <= 0) { showAlert('alertCarico', 'danger', 'Inserisci una quantità valida (maggiore di 0).'); return; }
        if (!data) { showAlert('alertCarico', 'danger', 'Seleziona una data.'); return; }

        var art = store.articoli.find(function (a) { return a.codice === codice; });
        if (!art) { showAlert('alertCarico', 'danger', 'Articolo non trovato.'); return; }

        art.giacenza += qta;

        store.movCarico.push({
            data: data,
            ora: oraAdesso(),
            codice: codice,
            descrizione: art.descrizione,
            qta: qta,
            fornitore: fornitore,
            documento: documento
        });

        saveStore(store);

        document.getElementById('caricoArticolo').value = '';
        document.getElementById('caricoQta').value = '1';
        document.getElementById('caricoFornitore').value = '';
        document.getElementById('caricoDocumento').value = '';

        showAlert('alertCarico', 'success', 'Caricati <strong>' + qta + '</strong> pz di <strong>' + art.descrizione + '</strong>. Nuova giacenza: <strong>' + art.giacenza + '</strong>');
        renderCarico();
        updateHeaderStats();
    };

    // ========================================================
    // SCARICO MERCE
    // ========================================================
    function renderScarico() {
        populateArticoloSelect('scaricoArticolo');
        var dataEl = document.getElementById('scaricoData');
        if (dataEl && !dataEl.value) dataEl.value = oggi();
        renderStoricoScarico();
    }

    function renderStoricoScarico() {
        var store = getStore();
        var tbody = document.getElementById('scaricoBody');
        if (!tbody) return;

        if (store.movScarico.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:30px;color:var(--gray-500);">' +
                '<div style="font-size:28px;margin-bottom:6px;">📤</div>Nessun movimento di scarico registrato</td></tr>';
            return;
        }

        tbody.innerHTML = store.movScarico.slice().reverse().map(function (m) {
            return '<tr>' +
                '<td>' + formatData(m.data) + '</td>' +
                '<td>' + (m.ora || '-') + '</td>' +
                '<td><code style="background:var(--gray-100);padding:2px 6px;border-radius:4px;font-size:11px;">' + m.codice + '</code></td>' +
                '<td>' + m.descrizione + '</td>' +
                '<td class="text-right"><strong style="color:var(--danger);">-' + m.qta + '</strong></td>' +
                '<td>' + (m.causale || '-') + '</td>' +
                '<td>' + (m.destinatario || '-') + '</td>' +
                '<td>' + (m.documento || '-') + '</td>' +
                '</tr>';
        }).join('');
    }

    window.registraScarico = function () {
        var store = getStore();
        var codice = document.getElementById('scaricoArticolo').value;
        var qta = parseInt(document.getElementById('scaricoQta').value);
        var data = document.getElementById('scaricoData').value;
        var causale = document.getElementById('scaricoCausale').value;
        var destinatario = document.getElementById('scaricoDestinatario').value.trim();
        var documento = document.getElementById('scaricoDocumento').value.trim();

        if (!codice) { showAlert('alertScarico', 'danger', 'Seleziona un articolo.'); return; }
        if (!qta || qta <= 0) { showAlert('alertScarico', 'danger', 'Inserisci una quantità valida (maggiore di 0).'); return; }
        if (!data) { showAlert('alertScarico', 'danger', 'Seleziona una data.'); return; }

        var art = store.articoli.find(function (a) { return a.codice === codice; });
        if (!art) { showAlert('alertScarico', 'danger', 'Articolo non trovato.'); return; }

        if (qta > art.giacenza) {
            showAlert('alertScarico', 'danger', 'Quantità insufficiente! Giacenza disponibile: <strong>' + art.giacenza + ' ' + art.um + '</strong>');
            return;
        }

        art.giacenza -= qta;

        store.movScarico.push({
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

        document.getElementById('scaricoArticolo').value = '';
        document.getElementById('scaricoQta').value = '1';
        document.getElementById('scaricoDestinatario').value = '';
        document.getElementById('scaricoDocumento').value = '';

        var msg = 'Scaricati <strong>' + qta + '</strong> pz di <strong>' + art.descrizione + '</strong>. Nuova giacenza: <strong>' + art.giacenza + '</strong>';
        if (art.giacenza <= art.scortaMin) {
            msg += '<br>⚠️ <strong>ATTENZIONE:</strong> La giacenza è sotto la scorta minima (' + art.scortaMin + ')!';
            showAlert('alertScarico', 'warning', msg);
        } else {
            showAlert('alertScarico', 'success', msg);
        }

        renderScarico();
        updateHeaderStats();
    };

    // ========================================================
    // NUOVO ARTICOLO
    // ========================================================
    function prepareNuovoArticolo() {
        var store = getStore();
        var codEl = document.getElementById('nuovoCodice');
        if (codEl) codEl.value = generaCodice('ART-', store.artCounter);
    }

    window.creaNuovoArticolo = function () {
        var store = getStore();
        var codice = document.getElementById('nuovoCodice').value;
        var descrizione = document.getElementById('nuovoDescrizione').value.trim();
        var categoria = document.getElementById('nuovoCategoria').value;
        var um = document.getElementById('nuovoUM').value;
        var giacenza = parseInt(document.getElementById('nuovoGiacenza').value) || 0;
        var scortaMin = parseInt(document.getElementById('nuovoScortaMin').value) || 0;
        var prezzo = parseFloat(document.getElementById('nuovoPrezzo').value) || 0;
        var posizione = document.getElementById('nuovoPosizione').value.trim();
        var note = document.getElementById('nuovoNote').value.trim();

        if (!descrizione) { showAlert('alertNuovo', 'danger', 'Inserisci la descrizione dell\'articolo.'); return; }
        if (!categoria) { showAlert('alertNuovo', 'danger', 'Seleziona una categoria.'); return; }

        var duplicato = store.articoli.find(function (a) { return a.codice === codice; });
        if (duplicato) { showAlert('alertNuovo', 'danger', 'Codice articolo già esistente!'); return; }

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

        showAlert('alertNuovo', 'success', 'Articolo <strong>' + codice + ' — ' + descrizione + '</strong> creato con successo!');
        resetFormNuovo();
        updateHeaderStats();
    };

    window.resetFormNuovo = function () {
        var store = getStore();
        document.getElementById('nuovoCodice').value = generaCodice('ART-', store.artCounter);
        document.getElementById('nuovoDescrizione').value = '';
        document.getElementById('nuovoCategoria').value = '';
        document.getElementById('nuovoUM').value = 'PZ';
        document.getElementById('nuovoGiacenza').value = '0';
        document.getElementById('nuovoScortaMin').value = '5';
        document.getElementById('nuovoPrezzo').value = '0';
        document.getElementById('nuovoPosizione').value = '';
        document.getElementById('nuovoNote').value = '';
    };

    // ========================================================
    // DDT — Documenti di Trasporto
    // ========================================================
    var ddtRigheTmp = [];

    function prepareDDT() {
        var store = getStore();
        var numEl = document.getElementById('ddtNumero');
        if (numEl) numEl.value = generaCodice('DDT-', store.ddtCounter);
        var dataEl = document.getElementById('ddtData');
        if (dataEl && !dataEl.value) dataEl.value = oggi();
        populateArticoloSelect('ddtArticoloSel');
        renderDDTRigheTmp();
        renderStoricoDDT();
    }

    function renderDDTRigheTmp() {
        var tbody = document.getElementById('ddtRigheBody');
        if (!tbody) return;

        if (ddtRigheTmp.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:20px;color:var(--gray-500);">Nessun articolo aggiunto</td></tr>';
            return;
        }

        tbody.innerHTML = ddtRigheTmp.map(function (r, i) {
            return '<tr>' +
                '<td><code>' + r.codice + '</code></td>' +
                '<td>' + r.descrizione + '</td>' +
                '<td class="text-center">' + r.um + '</td>' +
                '<td class="text-right"><strong>' + r.qta + '</strong></td>' +
                '<td class="text-center"><button class="btn btn-sm btn-danger" onclick="rimuoviRigaDDT(' + i + ')">✕</button></td>' +
                '</tr>';
        }).join('');
    }

    window.aggiungiRigaDDT = function () {
        var store = getStore();
        var codice = document.getElementById('ddtArticoloSel').value;
        var qta = parseInt(document.getElementById('ddtArticoloQta').value);

        if (!codice) { showAlert('alertDDT', 'danger', 'Seleziona un articolo.'); return; }
        if (!qta || qta <= 0) { showAlert('alertDDT', 'danger', 'Inserisci una quantità valida.'); return; }

        var art = store.articoli.find(function (a) { return a.codice === codice; });
        if (!art) return;

        var giaPresente = ddtRigheTmp.find(function (r) { return r.codice === codice; });
        var qtaTotale = qta + (giaPresente ? giaPresente.qta : 0);

        if (qtaTotale > art.giacenza) {
            showAlert('alertDDT', 'danger', 'Quantità richiesta supera la giacenza disponibile (' + art.giacenza + ' ' + art.um + ')');
            return;
        }

        if (giaPresente) {
            giaPresente.qta += qta;
        } else {
            ddtRigheTmp.push({
                codice: art.codice,
                descrizione: art.descrizione,
                um: art.um,
                qta: qta,
                prezzo: art.prezzo
            });
        }

        document.getElementById('ddtArticoloSel').value = '';
        document.getElementById('ddtArticoloQta').value = '1';
        renderDDTRigheTmp();
    };

    window.rimuoviRigaDDT = function (index) {
        ddtRigheTmp.splice(index, 1);
        renderDDTRigheTmp();
    };

    window.emettiDDT = function () {
        var store = getStore();
        var numero = document.getElementById('ddtNumero').value;
        var data = document.getElementById('ddtData').value;
        var destinatario = document.getElementById('ddtDestinatario').value.trim();
        var indirizzo = document.getElementById('ddtIndirizzo').value.trim();
        var causale = document.getElementById('ddtCausale').value;
        var trasporto = document.getElementById('ddtTrasporto').value;
        var note = document.getElementById('ddtNote').value.trim();

        if (!destinatario) { showAlert('alertDDT', 'danger', 'Inserisci il destinatario.'); return; }
        if (ddtRigheTmp.length === 0) { showAlert('alertDDT', 'danger', 'Aggiungi almeno un articolo al DDT.'); return; }
        if (!data) { showAlert('alertDDT', 'danger', 'Seleziona una data.'); return; }

        // Scarica la merce dal magazzino
        ddtRigheTmp.forEach(function (riga) {
            var art = store.articoli.find(function (a) { return a.codice === riga.codice; });
            if (art) {
                art.giacenza -= riga.qta;
                store.movScarico.push({
                    data: data,
                    ora: oraAdesso(),
                    codice: riga.codice,
                    descrizione: riga.descrizione,
                    qta: riga.qta,
                    causale: 'DDT ' + numero,
                    destinatario: destinatario,
                    documento: numero
                });
            }
        });

        store.ddtList.push({
            numero: numero,
            data: data,
            destinatario: destinatario,
            indirizzo: indirizzo,
            causale: causale,
            trasporto: trasporto,
            righe: JSON.parse(JSON.stringify(ddtRigheTmp)),
            note: note
        });

        store.ddtCounter++;
        saveStore(store);

        showAlert('alertDDT', 'success', 'DDT <strong>' + numero + '</strong> emesso con successo! Merce scaricata dal magazzino.');
        ddtRigheTmp = [];
        resetFormDDT();
        prepareDDT();
        updateHeaderStats();
    };

    window.resetFormDDT = function () {
        document.getElementById('ddtDestinatario').value = '';
        document.getElementById('ddtIndirizzo').value = '';
        document.getElementById('ddtCausale').value = 'Vendita';
        document.getElementById('ddtTrasporto').value = 'Mittente';
        document.getElementById('ddtNote').value = '';
        ddtRigheTmp = [];
        renderDDTRigheTmp();
    };

    function renderStoricoDDT() {
        var store = getStore();
        var tbody = document.getElementById('ddtListBody');
        if (!tbody) return;

        if (store.ddtList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:30px;color:var(--gray-500);">' +
                '<div style="font-size:28px;margin-bottom:6px;">🚚</div>Nessun DDT emesso</td></tr>';
            return;
        }

        tbody.innerHTML = store.ddtList.slice().reverse().map(function (d) {
            var totPz = d.righe.reduce(function (s, r) { return s + r.qta; }, 0);
            var totVal = d.righe.reduce(function (s, r) { return s + (r.qta * r.prezzo); }, 0);
            return '<tr>' +
                '<td><code style="background:var(--gray-100);padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;">' + d.numero + '</code></td>' +
                '<td>' + formatData(d.data) + '</td>' +
                '<td><strong>' + d.destinatario + '</strong></td>' +
                '<td>' + d.causale + '</td>' +
                '<td class="text-center">' + d.righe.length + ' (' + totPz + ' pz)</td>' +
                '<td class="text-right">' + formatValuta(totVal) + '</td>' +
                '<td class="text-center"><button class="btn btn-sm btn-outline" onclick="visualizzaDDT(\'' + d.numero + '\')">👁️ Vedi</button></td>' +
                '</tr>';
        }).join('');
    }

    window.visualizzaDDT = function (numero) {
        var store = getStore();
        var ddt = store.ddtList.find(function (d) { return d.numero === numero; });
        if (!ddt) return;

        var body = document.getElementById('ddtPreviewBody');
        var totVal = ddt.righe.reduce(function (s, r) { return s + (r.qta * r.prezzo); }, 0);

        var html = '<div class="ddt-header-doc">' +
            '<div class="ddt-company"><h3>📦 La Tua Azienda S.r.l.</h3><p>Via Roma 1, 00100 Roma (RM)<br>P.IVA: 01234567890</p></div>' +
            '<div class="ddt-title"><h2>DDT</h2><p><strong>' + ddt.numero + '</strong><br>Data: ' + formatData(ddt.data) + '</p></div></div>' +
            '<div class="ddt-parties"><div class="ddt-party"><h4>Mittente</h4><p><strong>La Tua Azienda S.r.l.</strong><br>Via Roma 1, 00100 Roma</p></div>' +
            '<div class="ddt-party"><h4>Destinatario</h4><p><strong>' + ddt.destinatario + '</strong><br>' + (ddt.indirizzo || 'Indirizzo non specificato') + '</p></div></div>' +
            '<p style="margin-bottom:8px;font-size:13px;"><strong>Causale:</strong> ' + ddt.causale + ' | <strong>Trasporto a cura:</strong> ' + ddt.trasporto + '</p>' +
            '<table class="data-table"><thead><tr><th>Codice</th><th>Descrizione</th><th class="text-center">U.M.</th><th class="text-right">Qtà</th><th class="text-right">Prezzo</th><th class="text-right">Totale</th></tr></thead><tbody>';

        ddt.righe.forEach(function (r) {
            html += '<tr><td>' + r.codice + '</td><td>' + r.descrizione + '</td><td class="text-center">' + r.um + '</td>' +
                '<td class="text-right">' + r.qta + '</td><td class="text-right">' + formatValuta(r.prezzo) + '</td>' +
                '<td class="text-right"><strong>' + formatValuta(r.qta * r.prezzo) + '</strong></td></tr>';
        });

        html += '</tbody></table>' +
            '<div class="totale-box"><strong>Totale Merce: ' + formatValuta(totVal) + '</strong></div>';

        if (ddt.note) {
            html += '<p style="margin-top:16px;font-size:12px;color:var(--gray-600);"><strong>Note:</strong> ' + ddt.note + '</p>';
        }

        html += '<div class="ddt-footer"><div class="ddt-signature"><p>Firma Mittente</p></div><div class="ddt-signature"><p>Firma Destinatario</p></div></div>';

        body.innerHTML = html;
        document.getElementById('modalDDTPreview').classList.add('open');
    };

    window.chiudiModalDDT = function () {
        document.getElementById('modalDDTPreview').classList.remove('open');
    };

    window.stampaDDT = function () {
        var content = document.getElementById('ddtPreviewBody').innerHTML;
        var win = window.open('', '_blank', 'width=800,height=600');
        win.document.write('<!DOCTYPE html><html><head><title>Stampa DDT</title>' +
            '<style>body{font-family:Arial,sans-serif;padding:40px;font-size:13px;color:#333;}' +
            'table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ccc;padding:8px 12px;text-align:left;}' +
            'th{background:#333;color:#fff;font-size:11px;text-transform:uppercase;}' +
            '.text-center{text-align:center;}.text-right{text-align:right;}' +
            '.ddt-header-doc{display:flex;justify-content:space-between;border-bottom:3px solid #333;padding-bottom:16px;margin-bottom:20px;}' +
            '.ddt-parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}' +
            '.ddt-party{padding:12px;border:1px solid #ccc;border-radius:4px;}' +
            '.ddt-party h4{font-size:10px;text-transform:uppercase;color:#888;margin-bottom:6px;}' +
            '.ddt-footer{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:40px;}' +
            '.ddt-signature{border-top:2px solid #333;padding-top:10px;text-align:center;}' +
            '.ddt-signature p{font-size:10px;color:#888;text-transform:uppercase;}' +
            '.totale-box{text-align:right;font-size:15px;padding:12px;background:#f5f5f5;border:1px solid #ddd;margin-top:10px;}' +
            'strong{font-weight:700;}code{background:#eee;padding:2px 5px;border-radius:3px;font-size:11px;}</style></head>' +
            '<body>' + content + '</body></html>');
        win.document.close();
        setTimeout(function () { win.print(); }, 500);
    };

    // ========================================================
    // ORDINI
    // ========================================================
    var ordineRigheTmp = [];

    function prepareOrdini() {
        var store = getStore();
        var numEl = document.getElementById('ordineNumero');
        if (numEl) numEl.value = generaCodice('ORD-', store.ordineCounter);
        var dataEl = document.getElementById('ordineData');
        if (dataEl && !dataEl.value) dataEl.value = oggi();
        populateArticoloSelect('ordineArticoloSel');
        renderOrdineRigheTmp();
        renderStoricoOrdini();
    }

    function renderOrdineRigheTmp() {
        var tbody = document.getElementById('ordineRigheBody');
        if (!tbody) return;

        if (ordineRigheTmp.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px;color:var(--gray-500);">Nessun articolo aggiunto</td></tr>';
            return;
        }

        var totale = 0;
        tbody.innerHTML = ordineRigheTmp.map(function (r, i) {
            var sub = r.qta * r.prezzo;
            totale += sub;
            return '<tr>' +
                '<td><code>' + r.codice + '</code></td>' +
                '<td>' + r.descrizione + '</td>' +
                '<td class="text-center">' + r.um + '</td>' +
                '<td class="text-right">' + r.qta + '</td>' +
                '<td class="text-right">' + formatValuta(sub) + '</td>' +
                '<td class="text-center"><button class="btn btn-sm btn-danger" onclick="rimuoviRigaOrdine(' + i + ')">✕</button></td>' +
                '</tr>';
        }).join('');

        var totBox = document.getElementById('ordineTotale');
        if (totBox) totBox.innerHTML = '<strong>Totale Ordine: ' + formatValuta(totale) + '</strong>';
    }

    window.aggiungiRigaOrdine = function () {
        var store = getStore();
        var codice = document.getElementById('ordineArticoloSel').value;
        var qta = parseInt(document.getElementById('ordineArticoloQta').value);

        if (!codice) { showAlert('alertOrdini', 'danger', 'Seleziona un articolo.'); return; }
        if (!qta || qta <= 0) { showAlert('alertOrdini', 'danger', 'Inserisci una quantità valida.'); return; }

        var art = store.articoli.find(function (a) { return a.codice === codice; });
        if (!art) return;

        var giaPresente = ordineRigheTmp.find(function (r) { return r.codice === codice; });
        if (giaPresente) {
            giaPresente.qta += qta;
        } else {
            ordineRigheTmp.push({
                codice: art.codice,
                descrizione: art.descrizione,
                um: art.um,
                qta: qta,
                prezzo: art.prezzo
            });
        }

        document.getElementById('ordineArticoloSel').value = '';
        document.getElementById('ordineArticoloQta').value = '1';
        renderOrdineRigheTmp();
    };

    window.rimuoviRigaOrdine = function (index) {
        ordineRigheTmp.splice(index, 1);
        renderOrdineRigheTmp();
    };

    window.creaOrdine = function () {
        var store = getStore();
        var numero = document.getElementById('ordineNumero').value;
        var data = document.getElementById('ordineData').value;
        var fornitore = document.getElementById('ordineFornitore').value.trim();
        var tipo = document.getElementById('ordineTipo').value;
        var note = document.getElementById('ordineNote').value.trim();

        if (!fornitore) { showAlert('alertOrdini', 'danger', 'Inserisci il fornitore.'); return; }
        if (ordineRigheTmp.length === 0) { showAlert('alertOrdini', 'danger', 'Aggiungi almeno un articolo all\'ordine.'); return; }
        if (!data) { showAlert('alertOrdini', 'danger', 'Seleziona una data.'); return; }

        var totale = ordineRigheTmp.reduce(function (s, r) { return s + (r.qta * r.prezzo); }, 0);

        store.ordiniList.push({
            numero: numero,
            data: data,
            fornitore: fornitore,
            tipo: tipo,
            righe: JSON.parse(JSON.stringify(ordineRigheTmp)),
            totale: totale,
            note: note,
            stato: 'In attesa'
        });

        store.ordineCounter++;
        saveStore(store);

        showAlert('alertOrdini', 'success', 'Ordine <strong>' + numero + '</strong> creato con successo!');
        ordineRigheTmp = [];
        resetFormOrdine();
        prepareOrdini();
    };

    window.resetFormOrdine = function () {
        document.getElementById('ordineFornitore').value = '';
        document.getElementById('ordineTipo').value = 'Acquisto';
        document.getElementById('ordineNote').value = '';
        ordineRigheTmp = [];
        renderOrdineRigheTmp();
        var totBox = document.getElementById('ordineTotale');
        if (totBox) totBox.innerHTML = '';
    };

    function renderStoricoOrdini() {
        var store = getStore();
        var tbody = document.getElementById('ordiniListBody');
        if (!tbody) return;

        if (store.ordiniList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:30px;color:var(--gray-500);">' +
                '<div style="font-size:28px;margin-bottom:6px;">📑</div>Nessun ordine registrato</td></tr>';
            return;
        }

        tbody.innerHTML = store.ordiniList.slice().reverse().map(function (o) {
            var statusClass = 'status-pending';
            if (o.stato === 'Confermato') statusClass = 'status-confirmed';
            else if (o.stato === 'Spedito') statusClass = 'status-shipped';
            else if (o.stato === 'Consegnato') statusClass = 'status-delivered';
            else if (o.stato === 'Annullato') statusClass = 'status-cancelled';

            return '<tr>' +
                '<td><code style="background:var(--gray-100);padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;">' + o.numero + '</code></td>' +
                '<td>' + formatData(o.data) + '</td>' +
                '<td><strong>' + o.fornitore + '</strong></td>' +
                '<td>' + o.tipo + '</td>' +
                '<td class="text-center">' + o.righe.length + ' art.</td>' +
                '<td class="text-right">' + formatValuta(o.totale) + '</td>' +
                '<td class="text-center"><span class="status-badge ' + statusClass + '">' + o.stato + '</span></td>' +
                '<td class="text-center"><select class="form-control" style="padding:4px 8px;font-size:11px;width:auto;display:inline;" onchange="cambiaStatoOrdine(\'' + o.numero + '\',this.value)">' +
                '<option value="In attesa"' + (o.stato === 'In attesa' ? ' selected' : '') + '>In attesa</option>' +
                '<option value="Confermato"' + (o.stato === 'Confermato' ? ' selected' : '') + '>Confermato</option>' +
                '<option value="Spedito"' + (o.stato === 'Spedito' ? ' selected' : '') + '>Spedito</option>' +
                '<option value="Consegnato"' + (o.stato === 'Consegnato' ? ' selected' : '') + '>Consegnato</option>' +
                '<option value="Annullato"' + (o.stato === 'Annullato' ? ' selected' : '') + '>Annullato</option>' +
                '</select></td></tr>';
        }).join('');
    }

    window.cambiaStatoOrdine = function (numero, nuovoStato) {
        var store = getStore();
        var ordine = store.ordiniList.find(function (o) { return o.numero === numero; });
        if (!ordine) return;

        // Se stato cambia a "Consegnato", carica la merce in magazzino
        if (nuovoStato === 'Consegnato' && ordine.stato !== 'Consegnato' && ordine.tipo === 'Acquisto') {
            ordine.righe.forEach(function (riga) {
                var art = store.articoli.find(function (a) { return a.codice === riga.codice; });
                if (art) {
                    art.giacenza += riga.qta;
                    store.movCarico.push({
                        data: oggi(),
                        ora: oraAdesso(),
                        codice: riga.codice,
                        descrizione: riga.descrizione,
                        qta: riga.qta,
                        fornitore: ordine.fornitore,
                        documento: ordine.numero
                    });
                }
            });
        }

        ordine.stato = nuovoStato;
        saveStore(store);
        renderStoricoOrdini();
        updateHeaderStats();
    };

    // ========================================================
    // RESET DATI COMPLETO
    // ========================================================
    window.resetTuttoDati = function () {
        if (confirm('⚠️ ATTENZIONE: Tutti i dati del magazzino verranno cancellati permanentemente. Continuare?')) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    };

    // ========================================================
    // INIZIALIZZAZIONE
    // ========================================================
    initSampleData();
    updateHeaderStats();
    switchTab('inventario');

})();
