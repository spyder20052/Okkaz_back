import AdminShell from "../AdminShell";
import styles from "../admin.module.css";

export default function AdminReglagesPage() {
  return (
    <AdminShell active="/admin/reglages">
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>Reglages</h1>
            <p>Simule les parametres de validation, commissions et roles admin.</p>
          </div>
          <label className={styles.search}>
            <span>Search</span>
            <input type="search" placeholder="Parametre" />
          </label>
          <div className={styles.avatar}>R</div>
        </header>

        <section className={styles.settingsGrid}>
          <article className={styles.simulator}>
            <h2>Regles plateforme</h2>
            <label>
              Option Numéro Direct
              <input type="text" defaultValue="2 500 FCFA" />
            </label>
            <label>
              Validation annonce gratuite
              <select defaultValue="72h">
                <option value="24h">24h</option>
                <option value="48h">48h</option>
                <option value="72h">72h</option>
              </select>
            </label>
            <button type="button">Enregistrer</button>
          </article>

          <article className={styles.simulator}>
            <h2>Roles admin</h2>
            <label>
              Nouvel operateur
              <input type="email" placeholder="agent@okkaz.bj" />
            </label>
            <div className={styles.checkList}>
              <label><input type="checkbox" defaultChecked /> Annonces</label>
              <label><input type="checkbox" defaultChecked /> KYC</label>
              <label><input type="checkbox" /> Paiements</label>
              <label><input type="checkbox" /> Litiges</label>
            </div>
            <button type="button">Inviter</button>
          </article>
        </section>
      </section>
    </AdminShell>
  );
}
