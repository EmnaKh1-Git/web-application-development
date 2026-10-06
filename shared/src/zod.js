import { z } from 'zod';
import { fr } from 'zod/locales';

// Messages d'erreur Zod par défaut en français, pour le Front-End et le Back-End.
// Tous les schémas du projet doivent importer `z` depuis ce fichier (ou depuis
// '@smart-ecommerce/shared') pour bénéficier de cette configuration.
// (Import de la seule langue française : les autres traductions ne sont pas embarquées.)
z.config(fr());

export { z };
