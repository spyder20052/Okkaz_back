import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

const disputes = [
  { title: "Retard de restitution", item: "iPhone 15 Pro Max", level: "Urgent" },
  { title: "Caution contestee", item: "Groupe electrogene 50kVA", level: "Moyen" },
  { title: "Etat des lieux incomplet", item: "Villa Moderne 4 Chambres", level: "Bas" },
];

export default function AdminLitigesPage() {
  return (
    <AdminShell active="/admin/litiges">
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
            <h1>Litiges</h1>
            <p>Simule la mediation OKKAZ entre proprietaire et locataire.</p>
          </div>
          <label className={styles.search}>
            <span>Search</span>
            <input type="search" placeholder="Bien, utilisateur, reference" />
          </label>
          <div className={styles.avatar}>L</div>
        </header>

        <section className={styles.actionPageGrid}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Dossiers ouverts</h2>
              <button type="button">Prioriser</button>
            </div>
            <div className={styles.actionList}>
              {disputes.map((dispute) => (
                <div className={styles.actionItem} key={dispute.title}>
                  <span>{dispute.level}</span>
                  <div>
                    <strong>{dispute.title}</strong>
                    <p>{dispute.item}</p>
                  </div>
                  <button type="button">Traiter</button>
                </div>
              ))}
            </div>
          </article>

          <aside className={styles.simulator}>
            <h2>Mediation</h2>
            <p>Choisis l&apos;etape et la decision a enregistrer.</p>
            <div className={styles.stepList}>
              <span>1. Ecouter les parties</span>
              <span>2. Verifier contrat</span>
              <span>3. Decider caution</span>
            </div>
            <textarea placeholder="Decision admin et prochaine action" />
            <div className={styles.buttonRow}>
              <button type="button">Cloturer</button>
              <button type="button">Escalader</button>
            </div>
          </aside>
        </section>
      </section>
    </AdminShell>
  );
}
