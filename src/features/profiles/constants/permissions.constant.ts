export interface PermissionModule {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: string;
}

export const PERMISSION_MODULES: PermissionModule[] = [
  // --- Vue Générale & Administration ---
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    description: 'Accès au tableau de bord avec les statistiques générales',
    icon: 'fa-solid fa-chart-pie',
    category: 'Général & Administration',
  },
  {
    id: 'profiles',
    label: 'Équipe & Profils',
    description: 'Gestion des comptes membres et attribution des profils de permissions',
    icon: 'fa-solid fa-user-shield',
    category: 'Général & Administration',
  },
  {
    id: 'settings',
    label: 'Paramètres généraux',
    description: 'Configuration technique et paramètres de la plateforme',
    icon: 'fa-solid fa-gear',
    category: 'Général & Administration',
  },
  {
    id: 'audit',
    label: 'Journal d\'Audit & Sécurité',
    description: 'Traçabilité des actions sensibles, décaissements et sécurité',
    icon: 'fa-solid fa-shield-halved',
    category: 'Général & Administration',
  },
  {
    id: 'options',
    label: 'Quartiers & Catégories',
    description: 'Gestion des zones géographiques, quartiers et catégories',
    icon: 'fa-solid fa-list-ul',
    category: 'Général & Administration',
  },

  // --- Finances & Trésorerie ---
  {
    id: 'finances',
    label: 'Finances & Trésorerie',
    description: 'Comptes financiers, cotisations, dépenses et pièces justificatives',
    icon: 'fa-solid fa-vault',
    category: 'Finances & Trésorerie',
  },
  {
    id: 'finances_providers',
    label: 'Passerelles de paiement',
    description: 'Configuration des clés API Wave et Orange Money',
    icon: 'fa-solid fa-credit-card',
    category: 'Finances & Trésorerie',
  },

  // --- Communication & Contenu ---
  {
    id: 'notifications',
    label: 'Notifications & Campagnes',
    description: 'Envoi de campagnes et notifications ciblées (SMS, WhatsApp, Push)',
    icon: 'fa-solid fa-bell',
    category: 'Communication & Contenu',
  },
  {
    id: 'groupes',
    label: 'Groupes d\'adhérents',
    description: 'Création et gestion des segments d\'adhérents pour le ciblage',
    icon: 'fa-solid fa-people-group',
    category: 'Communication & Contenu',
  },
  {
    id: 'messages',
    label: 'Boîte de messages',
    description: 'Lecture et traitement des messages reçus via le site public',
    icon: 'fa-solid fa-envelope',
    category: 'Communication & Contenu',
  },
  {
    id: 'editorial',
    label: 'Contenu éditorial',
    description: 'Articles, actualités et modifications des pages publiques',
    icon: 'fa-solid fa-pen-nib',
    category: 'Communication & Contenu',
  },

  // --- Terrain & Citoyens ---
  {
    id: 'agents_terrain',
    label: 'Agents de terrain',
    description: 'Suivi des agents, statistiques de terrain et validation des pointages',
    icon: 'fa-solid fa-street-view',
    category: 'Terrain & Citoyens',
  },
  {
    id: 'poles',
    label: 'Pôles d\'action',
    description: 'Gestion territoriale des pôles et rattachement des militants',
    icon: 'fa-solid fa-layer-group',
    category: 'Terrain & Citoyens',
  },
  {
    id: 'besoins',
    label: 'Besoins citoyens',
    description: 'Traitement des besoins signalés par la population',
    icon: 'fa-solid fa-hand-holding-heart',
    category: 'Terrain & Citoyens',
  },
  {
    id: 'adherents',
    label: 'Base des Adhérents',
    description: 'Consultation, recherche et exportation de la liste des adhérents',
    icon: 'fa-solid fa-users',
    category: 'Terrain & Citoyens',
  },

  // --- Vie du Mouvement ---
  {
    id: 'commissions',
    label: 'Commissions',
    description: 'Animation des commissions thématiques et équipes de travail',
    icon: 'fa-solid fa-sitemap',
    category: 'Vie du Mouvement',
  },
  {
    id: 'comptes_rendus',
    label: 'Comptes-rendus',
    description: 'Rédaction et archivage des comptes-rendus de réunion',
    icon: 'fa-solid fa-file-lines',
    category: 'Vie du Mouvement',
  },
  {
    id: 'evenements',
    label: 'Agenda & Événements',
    description: 'Organisation de rassemblements, réunions et manifestations',
    icon: 'fa-solid fa-calendar-check',
    category: 'Vie du Mouvement',
  },
  {
    id: 'idees',
    label: 'Boîte à Idées',
    description: 'Idées et propositions remontées par les citoyens',
    icon: 'fa-solid fa-lightbulb',
    category: 'Vie du Mouvement',
  },
  {
    id: 'sondages',
    label: 'Sondages internes',
    description: 'Création et résultats des sondages d\'opinion',
    icon: 'fa-solid fa-square-poll-vertical',
    category: 'Vie du Mouvement',
  },
];
