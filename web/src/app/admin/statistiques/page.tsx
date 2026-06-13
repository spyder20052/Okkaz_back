import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

const stats = [
  { label: "Utilisateurs actifs", value: "608", meta: "Objectif 600 atteint" },
  { label: "Achat / Vente actifs", value: "74", meta: "400 visees sur 24 mois" },
  { label: "Proprietaires", value: "126", meta: "120 objectif atteint" },
  { label: "Litiges reduits", value: "42%", meta: "vers objectif 50%" },
];

export default function AdminStatistiquesPage() {
  return (
    <AdminShell active="/admin/statistiques">
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>Statistiques</h1>
            <p>Suivi des objectifs du cahier des charges OKKAZ.</p>
          </div>
          <label className={styles.search}>
            <span>Search</span>
            <input type="search" placeholder="Metrique, periode" />
          </label>
          <div className={styles.avatar}>S</div>
        </header>

        <section className={styles.stats}>
          {stats.map((item) => (
            <article className={styles.statCard} key={item.label}>
              <span className={styles.icon}>{item.label[0]}</span>
              <div>
                <h2>{item.label}</h2>
                <p>{item.meta}</p>
              </div>
              <strong>{item.value}</strong>
            </article>
          ))}
        </section>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Performance hebdomadaire</h2>
              <p><span>+12%</span> volume d&apos;annonces</p>
            </div>
            <button type="button">Mensuel</button>
          </div>
          <div className={styles.chart} aria-hidden>
            {[36, 55, 72, 44, 83, 62, 90].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
