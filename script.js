class Magazzino {
    constructor() {
        this.articoli = JSON.parse(localStorage.getItem('magazzino')) || [            {codice: 'ART001', descrizione: 'Monitor 24"', giacenza: 15, prezzo: 199.99},
            {codice: 'ART002', descrizione: 'Tastiera Meccanica', giacenza: 8, prezzo: 89.99},
            {codice: 'ART003', descrizione: 'Mouse Wireless', giacenza: 25, prezzo: 29.99}
        ];
        this.caricaDati();
    }

    salva() {
        localStorage.setItem('magazzino', JSON.stringify(this.articoli));
    }

    caricaDati() {
        document.getElementById('totArticoli').textContent = `Articoli: ${this.articoli.length}`;
        let totGiacenza = this.articoli.reduce((sum, art) => sum + art.giacenza, 0);
        document.getElementById('totGiacenza').textContent = `Giacenza Tot: ${totGiacenza}`;
        this.aggiornaInventario();
    }

    aggiornaInventario() {
        const tbody = document.querySelector('#tabellaInventario tbody');
        tbody.innerHTML = '';
        this.articoli.forEach(art => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${art.codice}</td>
                <td>${art.descrizione}</td>
                <td>${art.giacenza}</td>
                <td>€${art.prezzo.toFixed(2)}</td>
                <td><button onclick="magazzino.elimina('${art.codice}')">🗑️</button></td>
            `;
        });
    }

    caricaMerce() {
        const select = document.getElementById('selectCarico');
        const codice = select.value;
        const qta = parseInt(document.getElementById('qtaCarico').value);
        
        if (!codice || !qta || qta <= 0) {
            alert('Seleziona articolo e quantità valida');
            return;
        }

        const art = this.articoli.find(a => a.codice === codice);
        art.giacenza += qta;
        this.salva();
        this.caricaDati();
        
        document.getElementById('logCarico').innerHTML = `
            ✅ Caricato ${qta} di ${art.descrizione} (Codice: ${codice})<br>
            Nuova giacenza: ${art.giacenza}
        `;
        document.getElementById('qtaCarico').value = '';
    }

    elimina(codice) {
        this.articoli = this.articoli.filter(a => a.codice !== codice);
        this.salva();
        this.caricaDati();
    }
}

const magazzino = new Magazzino();

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    };
});

// Popola select carico
function popolaSelect() {
    const select = document.getElementById('selectCarico');
    select.innerHTML = '<option value="">Seleziona articolo</option>';
    magazzino.articoli.forEach(art => {
        const opt = document.createElement('option');
        opt.value = art.codice;
        opt.textContent = `${art.codice} - ${art.descrizione}`;
        select.appendChild(opt);
    });
}
popolaSelect();
