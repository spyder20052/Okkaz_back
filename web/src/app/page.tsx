import styles from "./page.module.css";
import HeroSection from "@/components/HeroSection";
import StackedCards from "@/components/StackedCards";
import TextRevealSection from "@/components/TextRevealSection";
import MissionText from "@/components/MissionText";
import AwsmdInspiredSection from "@/components/AwsmdInspiredSection";
import OwnerSection from "@/components/OwnerSection";
import GallerySection from "@/components/GallerySection";

export default function Home() {
  return (
    <main className={styles.main}>
      <HeroSection />

      {/* Mission Section */}
      <section className={styles.missionSection}>
        <h3 className={styles.sectionSubtitle}>Location. Troc. Achat / Vente.</h3>
        <MissionText />
      </section>

      {/* Discover / Gallery Section */}
      <GallerySection />

      {/* GSAP Stacked Cards Section */}
      <StackedCards />

      <AwsmdInspiredSection />

      <OwnerSection />

      {/* GSAP Text Reveal Section */}
      <TextRevealSection />
    </main>
  );
}
