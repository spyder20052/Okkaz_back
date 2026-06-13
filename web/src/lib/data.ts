export interface Ad {
  id: string;
  reference: string;
  title: string;
  category: string;
  price: number;
  totalPrice?: number;
  deposit: number;
  minimumDuration: string;
  rentalMode: string;
  condition: string;
  availability: string;
  pickup: string;
  delivery: string;
  location: string;
  image: string;
  owner: string;
  ownerPhone: string;
  ownerType: string;
  ownerResponseTime: string;
  description: string;
  loaPossible: boolean;
  loaDuration?: string;
  paymentTerms: string;
  warranty: string;
  cancellationPolicy: string;
  verifiedAt: string;
  highlights: string[];
  included: string[];
  requirements: string[];
  security: string[];
  usageRules: string[];
  directNumber: boolean;
}

export interface SearchRequest {
  id: string;
  reference: string;
  title: string;
  category: string;
  budget: number;
  location: string;
  requester: string;
  urgency: "Standard" | "Express";
  description: string;
  createdAt: string;
}

export const mockAds: Ad[] = [
  {
    id: "1",
    reference: "OKK-AUTO-001",
    title: "Mercedes-Benz Classe G",
    category: "Véhicules",
    price: 150000,
    totalPrice: 12500000,
    deposit: 300000,
    minimumDuration: "1 mois",
    rentalMode: "Achat / Vente",
    condition: "Excellent état",
    availability: "Disponible cette semaine",
    pickup: "Retrait sur rendez-vous à Fidjrossè",
    delivery: "Livraison possible à Cotonou après validation du dossier",
    location: "Cotonou, Fidjrossè",
    image: "/ads/car1.jpg",
    owner: "Auto Prestige",
    ownerPhone: "+229 01 97 42 18 60",
    ownerType: "Professionnel vérifié",
    ownerResponseTime: "Réponse moyenne sous 2h",
    description: "Mercedes-Benz Classe G entretenue, propre et prête pour location premium. L'annonce convient aux particuliers ou entreprises qui souhaitent louer ou acheter via un contrat d'achat / vente.",
    loaPossible: true,
    loaDuration: "12 à 24 mois",
    paymentTerms: "Premier mois + caution avant remise du véhicule",
    warranty: "Caution remboursable après état des lieux retour",
    cancellationPolicy: "Annulation gratuite avant validation finale du rendez-vous",
    verifiedAt: "Contrôlée par OKKAZ le 18 mai 2026",
    highlights: ["Boîte automatique", "Climatisation", "Intérieur cuir", "Achat / Vente"],
    included: ["Assurance de base", "Contrôle mécanique", "Assistance propriétaire"],
    requirements: ["Pièce d'identité", "Justificatif de revenus", "Caution remboursable"],
    security: ["Annonce vérifiée", "Contrat digital OKKAZ", "Paiement suivi"],
    usageRules: ["Permis de conduire valide obligatoire", "Usage hors Bénin soumis à accord", "Carburant à la charge du locataire"],
    directNumber: true,
  },
  {
    id: "2",
    reference: "OKK-IMMO-002",
    title: "Villa Moderne 4 Chambres",
    category: "Immobilier",
    price: 500000,
    totalPrice: 65000000,
    deposit: 1000000,
    minimumDuration: "3 mois",
    rentalMode: "Achat / Vente",
    condition: "Neuf",
    availability: "Disponible immédiatement",
    pickup: "Visite à Arconville sur rendez-vous",
    delivery: "Remise des clés après signature du contrat",
    location: "Abomey-Calavi, Arconville",
    image: "/ads/house1.jpg",
    owner: "Immo Bénin",
    ownerPhone: "+229 01 61 22 44 90",
    ownerType: "Agence vérifiée",
    ownerResponseTime: "Réponse moyenne dans la journée",
    description: "Villa moderne neuve avec quatre chambres, salon spacieux et piscine. Elle est adaptée à une famille ou à une expatriation longue durée, avec possibilité d'achat après une période de location suivie.",
    loaPossible: true,
    loaDuration: "24 à 36 mois",
    paymentTerms: "Premier mois + caution de deux mois à la signature",
    warranty: "État des lieux entrant et sortant avec procès-verbal",
    cancellationPolicy: "Visite annulable ou reportable jusqu'à 12h avant le rendez-vous",
    verifiedAt: "Documents propriété contrôlés le 16 mai 2026",
    highlights: ["4 chambres", "Piscine", "Cuisine équipée", "Parking intérieur"],
    included: ["Visite accompagnée", "État des lieux", "Contrat de location"],
    requirements: ["Pièce d'identité", "Garant ou justificatif", "Caution de deux mois"],
    security: ["Propriétaire vérifié", "Documents contrôlés", "Suivi OKKAZ"],
    usageRules: ["Sous-location interdite sans accord", "Charges courantes à la charge du locataire", "Travaux soumis à validation écrite"],
    directNumber: false,
  },
  {
    id: "3",
    reference: "OKK-DIGI-003",
    title: "iPhone 15 Pro Max 256GB",
    category: "Électronique",
    price: 25000,
    totalPrice: 850000,
    deposit: 75000,
    minimumDuration: "2 semaines",
    rentalMode: "Location simple ou achat progressif",
    condition: "Très bon état",
    availability: "Disponible sous 24h",
    pickup: "Retrait à Ganhi ou livraison à convenir",
    delivery: "Livraison possible à Cotonou selon disponibilité",
    location: "Cotonou, Ganhi",
    image: "/ads/phone1.jpg",
    owner: "Digital Store",
    ownerPhone: "+229 01 52 08 33 11",
    ownerType: "Boutique vérifiée",
    ownerResponseTime: "Réponse moyenne sous 1h",
    description: "iPhone 15 Pro Max 256GB en très bon état, idéal pour usage professionnel, création de contenu ou test avant achat. L'appareil est contrôlé avant remise et son IMEI est vérifié.",
    loaPossible: true,
    loaDuration: "6 à 12 mois",
    paymentTerms: "Paiement Mobile Money accepté avant retrait",
    warranty: "Caution remboursable si l'appareil revient sans dommage",
    cancellationPolicy: "Réservation annulable avant paiement de la caution",
    verifiedAt: "IMEI vérifié le 20 mai 2026",
    highlights: ["256GB", "Batterie contrôlée", "Face ID fonctionnel", "Accessoires inclus"],
    included: ["Chargeur", "Coque de protection", "Test au retrait"],
    requirements: ["Pièce d'identité", "Numéro Mobile Money actif", "Caution"],
    security: ["IMEI vérifié", "Contrat digital", "Paiement Mobile Money"],
    usageRules: ["Compte iCloud personnel autorisé", "Réinitialisation obligatoire au retour", "Réparation non autorisée sans accord"],
    directNumber: true,
  },
  {
    id: "4",
    reference: "OKK-PRO-004",
    title: "Groupe Électrogène 50kVA",
    category: "Équipements Pro",
    price: 75000,
    deposit: 150000,
    minimumDuration: "1 jour",
    rentalMode: "Location courte durée",
    condition: "Bon état",
    availability: "Disponible sur réservation",
    pickup: "Livraison possible à Porto-Novo",
    delivery: "Transport et installation possibles sur devis",
    location: "Porto-Novo",
    image: "/ads/generator1.jpg",
    owner: "Pro Equipment",
    ownerPhone: "+229 01 44 70 19 25",
    ownerType: "Entreprise vérifiée",
    ownerResponseTime: "Réponse moyenne sous 3h",
    description: "Groupe électrogène 50kVA adapté aux chantiers, événements et besoins de secours. Le matériel est testé avant départ et peut être livré avec assistance de mise en route.",
    loaPossible: false,
    paymentTerms: "Paiement de la durée prévue + caution avant livraison",
    warranty: "Caution remboursable après contrôle technique retour",
    cancellationPolicy: "Annulation possible jusqu'à 24h avant livraison",
    verifiedAt: "Contrôle technique effectué le 14 mai 2026",
    highlights: ["50kVA", "Usage chantier", "Livraison possible", "Test avant retrait"],
    included: ["Câbles de raccordement", "Guide d'utilisation", "Contrôle avant retrait"],
    requirements: ["Pièce d'identité", "Adresse du chantier", "Caution matériel"],
    security: ["État des lieux", "Contrat de location", "Support propriétaire"],
    usageRules: ["Installation sur surface stable", "Carburant à la charge du locataire", "Retour avec niveau et accessoires conformes"],
    directNumber: false,
  },
];

export const mockSearchRequests: SearchRequest[] = [
  {
    id: "REQ-001",
    reference: "OKK-REQ-001",
    title: "Je recherche une voiture 4x4 pour chantier",
    category: "Véhicules",
    budget: 180000,
    location: "Cotonou / Abomey-Calavi",
    requester: "Entreprise BTP",
    urgency: "Express",
    description: "Besoin d'un 4x4 robuste avec chauffeur possible pour 10 jours de suivi chantier.",
    createdAt: "Il y a 35 min",
  },
  {
    id: "REQ-002",
    reference: "OKK-REQ-002",
    title: "Je recherche un groupe electrogene 30-50kVA",
    category: "Équipements Pro",
    budget: 90000,
    location: "Porto-Novo",
    requester: "Evenementiel Porto",
    urgency: "Standard",
    description: "Location weekend avec livraison et installation souhaitees.",
    createdAt: "Il y a 2 h",
  },
  {
    id: "REQ-003",
    reference: "OKK-REQ-003",
    title: "Je recherche un studio meuble",
    category: "Immobilier",
    budget: 250000,
    location: "Akpakpa",
    requester: "Client verifie",
    urgency: "Standard",
    description: "Studio meuble pour 2 mois minimum, proche voie principale.",
    createdAt: "Aujourd'hui",
  },
];
