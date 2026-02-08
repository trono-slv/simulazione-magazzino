(function () {
    'use strict';

    // ============================================================
    // DATA STORE
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
    // DATI DI ESEMPIO
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
        // Nascondi tutte le sezioni
        var sections = document.querySelectorAll('.section');
        for (var i = 0; i < sections.length; i++) {
            sections[i].classList.remove('active');
        }

        // Disattiva tutti i tab
        var tabs = document.querySelectorAll('.nav-tab');
        for (var j = 0; j < tabs.length; j++) {
            tabs[j
