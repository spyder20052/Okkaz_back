import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

const contracts = [
  { item: "Mercedes-Benz Classe G", client: "Nadia H.", progress: "3/24", next: "30 mai 2026" },
  { item: "Villa Moderne 4 Chambres", client: "Famille A.", progress: "5/36", next: "02 juin 2026" },
  { item: "iPhone 15 Pro Max", client: "Joelle M.", progress: "2/12", next: "25 mai 2026" },
];

export default function AdminContratsPage() {
  return (
    <AdminShell active="/admin/contrats">
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>Contrats Achat / Vente</h1>
            <p>Suivi des mensualites, signatures et levees d option d achat.</p>
          </div>
          <label className={styles.search}>
            <span>Search</span>
            <input type="search" placeholder="Contrat, client, bien" />
          </label>
          <div className={styles.avatar}>C</div>
        </header>

        <section className={styles.actionPageGrid}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Dossiers Achat / Vente actifs</h2>
              <button type="button">Echeances</button>
            </div>
            <div className={styles.actionList}>
              {contracts.map((contract) => (
                <div className={styles.actionItem} key={contract.item}>
                  <span>{contract.progress}</span>
                  <div>
                    <strong>{contract.item}</strong>
                    <p>{contract.client} - prochaine echeance {contract.next}</p>
                  </div>
                  <button type="button">Suivre</button>
                </div>
              ))}
            </div>
          </article>

          <aside className={styles.simulator}>
            <h2>Simulation Achat / Vente</h2>
            <label>
              Prix du bien
              <input type="text" defaultValue="12 500 000 FCFA" />
            </label>
            <label>
              Duree
              <select defaultValue="24">
                <option value="12">12 mois</option>
                <option value="24">24 mois</option>
                <option value="36">36 mois</option>
              </select>
            </label>
            <label>
              Apport initial
              <input type="text" defaultValue="300 000 FCFA" />
            </label>
            <div className={styles.buttonRow}>
              <button type="button">Generer contrat</button>
              <button type="button">Bloquer dossier</button>
            </div>
          </aside>
        </section>
      </section>
    </AdminShell>
  );
}
