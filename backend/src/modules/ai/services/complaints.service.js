import { AI_LEVEL, COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS } from '@smart-ecommerce/shared';
import { NotFoundError } from '../../../core/errors/index.js';
import * as reviewsModule from '../../reviews/index.js';
import { withClaude } from '../ai.data.js';
import {
  classifyComplaint,
  complaintPriority,
  complaintReplyTemplate,
} from '../engine/complaints.js';
import { generateStructured } from '../llm/claude.js';

function analyze(complaint) {
  const { category, confidence } = classifyComplaint(complaint);
  const priority = complaintPriority({ ...complaint, category });
  return {
    category,
    categoryLabel: COMPLAINT_CATEGORY_LABELS[category],
    confidence,
    priority: priority.level,
    score: priority.score,
    sentiment: priority.sentiment,
    reasons: priority.reasons,
  };
}

/** Catégorie et priorité de chaque réclamation, plus un résumé des réclamations ouvertes. */
export async function getComplaintInsights() {
  const complaints = await reviewsModule.getComplaintsForAnalysis();
  const items = {};
  const byCategory = {};
  let urgentOpen = 0;
  for (const complaint of complaints) {
    const analysis = analyze(complaint);
    items[complaint.id] = analysis;
    const isOpen = [COMPLAINT_STATUS.OPEN, COMPLAINT_STATUS.IN_PROGRESS].includes(complaint.status);
    if (isOpen) {
      byCategory[analysis.category] = (byCategory[analysis.category] ?? 0) + 1;
      if (analysis.priority === AI_LEVEL.HIGH) urgentOpen += 1;
    }
  }
  return { items, summary: { urgentOpen, byCategory } };
}

const REPLY_SCHEMA = {
  type: 'object',
  properties: { reply: { type: 'string', description: 'Réponse complète au client' } },
  required: ['reply'],
  additionalProperties: false,
};

/** Brouillon de réponse au client : l'administrateur le relit et le modifie avant l'envoi. */
export async function suggestComplaintReply(complaintId) {
  const [complaint] = await reviewsModule.getComplaintsForAnalysis({ ids: [complaintId] });
  if (!complaint) throw new NotFoundError('Réclamation introuvable', 'COMPLAINT_NOT_FOUND');
  const analysis = analyze(complaint);
  const firstName = complaint.customer?.firstName;

  const result = await withClaude(
    () =>
      generateStructured({
        system:
          'Tu es le service client de SmartE-Commerce, boutique en ligne tunisienne. Rédige en français une réponse ' +
          'courte (5 phrases au maximum), empathique et professionnelle, qui commence par « Bonjour <prénom>, » et se ' +
          'termine par « L’équipe SmartE-Commerce ». Engagements possibles uniquement : échange, remboursement après ' +
          'vérification, nouvel envoi, contact du transporteur, retour gratuit. Ne promets aucune date précise ni ' +
          'aucun geste commercial chiffré.',
        content:
          `Prénom du client : ${firstName ?? 'inconnu'}\n` +
          `Commande concernée : ${complaint.orderId ? `n°${complaint.orderId}` : 'aucune'}\n` +
          `Catégorie détectée : ${analysis.categoryLabel}\n` +
          `Objet : ${complaint.subject}\nMessage : ${complaint.description}`,
        schema: REPLY_SCHEMA,
      }),
    async () => ({
      reply: complaintReplyTemplate({
        firstName,
        category: analysis.category,
        orderId: complaint.orderId,
      }),
    }),
  );
  return { ...result, analysis };
}
