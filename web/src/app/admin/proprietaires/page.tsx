import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

const owners = [
  { name: "Auto Prestige", plan: "Premium", stock: "7 biens", payout: "J+1" },
  { name: "Immo Benin", plan: "Pro", stock: "4 biens", payout: "J+2" },
  { name: "Digital Store", plan: "Gratuit", stock: "2 biens", payout: "En attente" },
];

export default function AdminProprietairesPage() {
  return (
    <AdminShell active="/admin/proprietaires">
      <section className={styles.content}>
        <p
          style={{
            margin: "0 0 16px",
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(234, 179, 8, 0.14)",
            color: "#92400e",
            fontWeight: 800,
            fontSize: "0.86rem",
          }}
        >
          ⚠️ Démo statique — non connecté au backend (endpoint manquant)
        </p>
        <header className={styles.header}>
          <div>
            <h1>Proprietaires</h1>
            <p>Suivi des offreurs, revenus, disponibilites et badges Pro.</p>
          </div>
          <label className={styles.search}>
            <span>Search</span>
            <input type="search" placeholder="Proprietaire, IFU, ville" />
          </label>
          <div className={styles.avatar}>O</div>
        </header>

        <section className={styles.actionPageGrid}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Offreurs actifs</h2>
              <button type="button">Exporter</button>
            </div>
            <div className={styles.actionList}>
              {owners.map((owner) => (
                <div className={styles.actionItem} key={owner.name}>
                  <span>{owner.plan}</span>
                  <div>
                    <strong>{owner.name}</strong>
                    <p>{owner.stock} - versement {owner.payout}</p>
                  </div>
                  <button type="button">Gerer</button>
                </div>
              ))}
            </div>
          </article>

          <aside className={styles.simulator}>
            <h2>Badge proprietaire</h2>
            <p>Simule promotion, retrait ou controle renforce.</p>
            <div className={styles.checkList}>
              <label><input type="checkbox" defaultChecked /> Documents valides</label>
              <label><input type="checkbox" defaultChecked /> Historique correct</label>
              <label><input type="checkbox" /> Litiges ouverts</label>
            </div>
            <div className={styles.buttonRow}>
              <button type="button">Accorder Pro</button>
              <button type="button">Retirer badge</button>
            </div>
          </aside>
        </section>
      </section>
    </AdminShell>
  );
}
