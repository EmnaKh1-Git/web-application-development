import { COMPLAINT_STATUS_LIST, PERMISSIONS } from '@smart-ecommerce/shared';
import { col, fn, Op } from 'sequelize';
import { NotFoundError, ValidationError } from '../../core/errors/index.js';
import { assertOwnershipOrPermission } from '../../core/security/ownership.js';
import { buildPaginationMeta, toSequelizePagination } from '../../core/utils/pagination.js';
import { likeContains } from '../../core/utils/query.js';
import { models } from '../../database/index.js';
import * as ordersModule from '../orders/index.js';

/* Réclamations des clients et traitement par l'administrateur. */

const { Complaint, User } = models;

const customerInclude = {
  model: User,
  as: 'customer',
  attributes: ['id', 'firstName', 'lastName', 'email'],
};
const handlerInclude = { model: User, as: 'handler', attributes: ['id', 'firstName', 'lastName'] };

export function toComplaintResponse(complaint) {
  return {
    id: complaint.id,
    subject: complaint.subject,
    description: complaint.description,
    status: complaint.status,
    orderId: complaint.orderId,
    adminResponse: complaint.adminResponse,
    handledBy: complaint.handler && `${complaint.handler.firstName} ${complaint.handler.lastName}`,
    handledAt: complaint.handledAt,
    customer: complaint.customer && {
      id: complaint.customer.id,
      firstName: complaint.customer.firstName,
      lastName: complaint.customer.lastName,
      email: complaint.customer.email,
    },
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
}

export async function createComplaint(user, { subject, description, orderId }) {
  if (orderId && !(await ordersModule.findUserOrder(orderId, user.id))) {
    throw new ValidationError([
      {
        field: 'orderId',
        location: 'body',
        message: "Cette commande n'existe pas dans votre historique",
      },
    ]);
  }
  const complaint = await Complaint.create({ userId: user.id, subject, description, orderId });
  return getComplaint(complaint.id, user);
}

export async function listMyComplaints(userId, { page, limit, status }) {
  const { rows, count } = await Complaint.findAndCountAll({
    where: { userId, ...(status && { status }) },
    include: [handlerInclude],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    ...toSequelizePagination({ page, limit }),
  });
  return {
    items: rows.map(toComplaintResponse),
    meta: buildPaginationMeta({ page, limit }, count),
  };
}

/** Détail : l'auteur de la réclamation ou un gestionnaire (complaints:manage). */
export async function getComplaint(complaintId, viewer) {
  const complaint = await Complaint.findByPk(complaintId, {
    include: [customerInclude, handlerInclude],
  });
  if (!complaint) throw new NotFoundError('Réclamation introuvable', 'COMPLAINT_NOT_FOUND');
  assertOwnershipOrPermission(viewer, complaint.userId, PERMISSIONS.COMPLAINTS_MANAGE);
  return toComplaintResponse(complaint);
}

/** Toutes les réclamations (ou certaines) pour l'analyse automatique du module IA. */
export async function getComplaintsForAnalysis({ ids } = {}) {
  const complaints = await Complaint.findAll({
    where: ids ? { id: ids } : {},
    include: [customerInclude, handlerInclude],
    order: [['createdAt', 'ASC']],
  });
  return complaints.map(toComplaintResponse);
}

export async function listAllComplaints({ page, limit, status, search }) {
  const where = { ...(status && { status }) };
  if (search) {
    const term = likeContains(search);
    where[Op.or] = [
      { subject: { [Op.like]: term } },
      { '$customer.first_name$': { [Op.like]: term } },
      { '$customer.last_name$': { [Op.like]: term } },
      { '$customer.email$': { [Op.like]: term } },
    ];
  }
  const { rows, count } = await Complaint.findAndCountAll({
    where,
    include: [customerInclude, handlerInclude],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    ...toSequelizePagination({ page, limit }),
  });
  return {
    items: rows.map(toComplaintResponse),
    meta: buildPaginationMeta({ page, limit }, count),
  };
}

export async function getComplaintStats() {
  const rows = await Complaint.findAll({
    attributes: ['status', [fn('COUNT', col('id')), 'count']],
    group: ['status'],
    raw: true,
  });
  const byStatus = Object.fromEntries(COMPLAINT_STATUS_LIST.map((status) => [status, 0]));
  for (const row of rows) byStatus[row.status] = Number(row.count);
  return { byStatus };
}

/** Traitement par l'administrateur : nouveau statut + réponse visible par le client. */
export async function handleComplaint(actor, complaintId, { status, adminResponse }) {
  const complaint = await Complaint.findByPk(complaintId);
  if (!complaint) throw new NotFoundError('Réclamation introuvable', 'COMPLAINT_NOT_FOUND');
  await complaint.update({
    status,
    ...(adminResponse !== undefined && { adminResponse }),
    handledBy: actor.id,
    handledAt: new Date(),
  });
  return getComplaint(complaintId, actor);
}
