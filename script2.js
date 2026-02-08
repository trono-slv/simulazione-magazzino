/*  ============================================================
    SCRIPT2.JS — DDT + ORDINI
    ============================================================ */

/* ====== DDT ====== */
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
    var s = getStore(), idx = trovaArticolo(s, codice);
    if (idx === -1) return;
    var a = s.articoli[idx];
    if (a.giacenza < qta) { showAlert('alertDDT', 'danger', 'Giacenza insufficiente per <strong>' + a.descrizione + '</strong> (Disp: ' + a.giacenza + ')'); return; }

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
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999;">Nessun articolo aggiunto</td></tr>';
        if (totBox) totBox.innerHTML = '';
        return;
    }
    var html = '', totale = 0;
    for (var i = 0; i < ddtRighe.length; i++) {
        var r = ddtRighe[i], sub = r.qta * r.prezzo;
        totale += sub;
        html += '<tr><td><strong>' + r.codice + '</strong></td><td>' + r.descrizione + '</td><td class="text-center">' + r.um + '</td><td class="text-right">' + r.qta + '</td><td class="text-right">' + formatValuta(r.prezzo) + '</td><td class="text-right">' + formatValuta(sub) + '</td><td class="text-center"><button class="btn btn-sm btn-danger" onclick="rimuoviRigaDDT(' + i + ')">✕</button></td></tr>';
    }
    body.innerHTML = html;
    if (totBox) totBox.innerHTML = '<strong>Totale: ' + formatValuta(totale) + '</strong>';
}

window.resetFormDDT = function () {
    ddtRighe = [];
    var el1 = document.getElementById('ddtDestinatario'); if (el1) el1.value = '';
    var el2 = document.getElementById('ddtIndirizzo'); if (el2) el2.value = '';
    var el3 = document.getElementById('ddtNote'); if (el3) el3.value = '';
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

    var s = getStore();
    for (var i = 0; i < ddtRighe.length; i++) {
        var idx = trovaArticolo(s, ddtRighe[i].codice);
        if (idx === -1) { showAlert('alertDDT', 'danger', 'Articolo ' + ddtRighe[i].codice + ' non trovato.'); return; }
        if (s.articoli[idx].giacenza < ddtRighe[i].qta) {
            showAlert('alertDDT', 'danger', 'Giacenza insufficiente per <strong>' + ddtRighe[i].descrizione + '</strong>');
            return;
        }
    }

    var totale = 0;
    for (var j = 0; j < ddtRighe.length; j++) {
        var idx2 = trovaArticolo(s, ddtRighe[j].codice);
        s.articoli[idx2].giacenza -= ddtRighe[j].qta;
        totale += ddtRighe[j].qta * ddtRighe[j].prezzo;
        s.movScarico.unshift({ data: data, ora: oraAdesso(), codice: ddtRighe[j].codice, descrizione: ddtRighe[j].descrizione, qta: ddtRighe[j].qta, causale: 'DDT ' + numero, destinatario: dest, documento: numero });
    }

    s.ddtList.unshift({ numero: numero, data: data, destinatario: dest, indirizzo: indirizzo, causale: causale, trasporto: trasporto, note: note, righe: JSON.parse(JSON.stringify(ddtRighe)), totale: totale });
    s.ddtCounter = (s.ddtCounter || 1) + 1;
    saveStore(s);
    updateHeaderStats();
    ddtRighe = [];
    showAlert('alertDDT', 'success', 'DDT <strong>' + numero + '</strong> emesso con successo! Merce scaricata.');
    resetFormDDT();
};

function renderDDTList() {
    var s = getStore(), body = document.getElementById('ddtListBody'), empty = document.getElementById('emptyDDT');
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
    var s = getStore(), d = s.ddtList[idx];
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

/* ====== ORDINI ====== */
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
    var s = getStore(), idx = trovaArticolo(s, codice);
    if (idx === -1) return;
    var a = s.articoli[idx];
    for (var i = 0; i < ordineRighe.length; i++) {
        if (ordineRighe[i].codice === codice) { ordineRighe[i].qta += qta; renderOrdineRighe(); return; }
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
    var body = document.getElementById('ordineRigheBody'), totBox = document.getElementById('ordineTotale');
    if (!body) return;
    if (ordineRighe.length === 0) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999;">Nessun articolo aggiunto</td></tr>';
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
    var el1 = document.getElementById('ordineFornitore'); if (el1) el1.value = '';
    var el2 = document.getElementById('ordineNote'); if (el2) el2.value = '';
    renderOrdineRighe();
    inizializzaOrdini();
};

window.creaOrdine = function () {
    var numero = document.getElementById('ordineNumero').value;
    var data = document.getElementById('ordineData').value;
    var fornitore = (document.getElementById('ordineFornitore').value || '').trim();
    var tipo = document.getElementById('ordineTipo').value;
    var note = (document.getElementById('ordineNote').value || '').trim();
    if (!fornitore) { showAlert('alertOrdine', 'danger', 'Inserisci fornitore/cliente.'); return; }
    if (ordineRighe.length === 0) { showAlert('alertOrdine', 'danger', 'Aggiungi almeno un articolo.'); return; }
    var totale = 0;
    for (var i = 0; i < ordineRighe.length; i++) totale += ordineRighe[i].qta * ordineRighe[i].prezzo;
    var s = getStore();
    s.ordiniList.unshift({ numero: numero, data: data, fornitore: fornitore, tipo: tipo, note: note, righe: JSON.parse(JSON.stringify(ordineRighe)), totale: totale, stato: 'In attesa' });
    s.ordineCounter = (s.ordineCounter || 1) + 1;
    saveStore(s);
    updateHeaderStats();
    ordineRighe = [];
    showAlert('alertOrdine', 'success', 'Ordine <strong>' + numero + '</strong> creato!');
    resetFormOrdine();
};

function renderOrdiniList() {
    var s = getStore(), body = document.getElementById('ordiniListBody'), empty = document.getElementById('emptyOrdini');
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
        var sc = 'status-pending';
        if (o.stato === 'Confermato') sc = 'status-confirmed';
        if (o.stato === 'Spedito') sc = 'status-shipped';
        if (o.stato === 'Consegnato') sc = 'status-delivered';
        if (o.stato === 'Annullato') sc = 'status-cancelled';

        var selHtml = '<select class="form-control" style="font-size:11px;padding:4px 8px;width:auto;" onchange="aggiornaStatoOrdine(' + i + ',this.value)">' +
            '<option value="In attesa"' + (o.stato === 'In attesa' ? ' selected' : '') + '>In attesa</option>' +
            '<option value="Confermato"' + (o.stato === 'Confermato' ? ' selected' : '') + '>Confermato</option>' +
            '<option value="Spedito"' + (o.stato === 'Spedito' ? ' selected' : '') + '>Spedito</option>' +
            '<option value="Consegnato"' + (o.stato === 'Consegnato' ? ' selected' : '') + '>Consegnato</option>' +
            '<option value="Annullato"' + (o.stato === 'Annullato' ? ' selected' : '') + '>Annullato</option></select>';

        html += '<tr><td><strong>' + o.numero + '</strong></td><td>' + formatData(o.data) + '</td><td>' + o.fornitore + '</td><td>' + (o.tipo || 'Acquisto') + '</td><td class="text-right">' + o.righe.length + '</td><td class="text-right">' + formatValuta(o.totale) + '</td><td class="text-center"><span class="status-badge ' + sc + '">' + o.stato + '</span></td><td class="text-center">' + selHtml + '</td></tr>';
    }
    body.innerHTML = html;
}

window.aggiornaStatoOrdine = function (idx, nuovoStato) {
    var s = getStore();
    if (!s.ordiniList[idx]) return;
    var vecchio = s.ordiniList[idx].stato;
    s.ordiniList[idx].stato = nuovoStato;

    if (nuovoStato === 'Consegnato' && vecchio !== 'Consegnato' && (s.ordiniList[idx].tipo === 'Acquisto' || !s.ordiniList[idx].tipo)) {
        for (var i = 0; i < s.ordiniList[idx].righe.length; i++) {
            var r = s.ordiniList[idx].righe[i];
            var artIdx = trovaArticolo(s, r.codice);
            if (artIdx !== -1) {
                s.articoli[artIdx].giacenza += r.qta;
                s.movCarico.unshift({ data: oggi(), ora: oraAdesso(), codice: r.codice, descrizione: r.descrizione, qta: r.qta, fornitore: s.ordiniList[idx].fornitore, documento: s.ordiniList[idx].numero });
            }
        }
        showAlert('alertOrdine', 'success', 'Ordine <strong>' + s.ordiniList[idx].numero + '</strong> consegnato! Merce caricata.');
    } else if (nuovoStato === 'Consegnato' && vecchio !== 'Consegnato' && s.ordiniList[idx].tipo === 'Vendita') {
        for (var j = 0; j < s.ordiniList[idx].righe.length; j++) {
            var rv = s.ordiniList[idx].righe[j];
            var artIdx2 = trovaArticolo(s, rv.codice);
            if (artIdx2 !== -1) {
                s.articoli[artIdx2].giacenza -= rv.qta;
                if (s.articoli[artIdx2].giacenza < 0) s.articoli[artIdx2].giacenza = 0;
                s.movScarico.unshift({ data: oggi(), ora: oraAdesso(), codice: rv.codice, descrizione: rv.descrizione, qta: rv.qta, causale: 'Ordine vendita', destinatario: s.ordiniList[idx].fornitore, documento: s.ordiniList[idx].numero });
            }
        }
        showAlert('alertOrdine', 'success', 'Ordine vendita consegnato! Merce scaricata.');
    } else {
        showAlert('alertOrdine', 'info', 'Stato aggiornato a: <strong>' + nuovoStato + '</strong>');
    }

    saveStore(s);
    updateHeaderStats();
    renderOrdiniList();
};
