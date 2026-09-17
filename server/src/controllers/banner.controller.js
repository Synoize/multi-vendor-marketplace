/**
 * Damini Marketplace - Banner, Video, Ads, Notification, Support, Report, Festival Controllers
 */

const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response.util');
const { query, queryOne, queryRows } = require('../database/connection');
const { getPagination, getCursorPagination, encodeCursor } = require('../utils/pagination.util');
const { v4: uuidv4 } = require('uuid');
const notificationService = require('../services/notification.service');
const { broadcastTicketMessage } = require('../socket/socket');

// ─── BANNER ───────────────────────────────────────────────────────────────────

/** GET /banners */
const listBanners = asyncHandler(async (req, res) => {
  const { position, all } = req.query;
  let where;
  const params = [];
  if (all === '1') {
    where = position ? 'WHERE position = ?' : '';
    if (position) params.push(position);
  } else {
    where = position ? 'WHERE position = ? AND is_active = 1' : 'WHERE is_active = 1';
    if (position) params.push(position);
  }
  const banners = await queryRows(`SELECT * FROM banners ${where} ORDER BY sort_order`, params);
  sendSuccess(res, banners);
});

/** POST /banners — admin */
const createBanner = asyncHandler(async (req, res) => {
  const { title, subtitle, link, position, sort_order, starts_at, ends_at } = req.body;
  const files = req.files || {};
  const image = files.image?.[0] ? `/uploads/banners/${files.image[0].filename}` : req.body.image;
  const mobile_image = files.mobile_image?.[0] ? `/uploads/banners/${files.mobile_image[0].filename}` : req.body.mobile_image;
  await query(
    'INSERT INTO banners (title, subtitle, image, mobile_image, link, position, sort_order, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title, subtitle || null, image, mobile_image || null, link || null, position || 'hero', sort_order || 0, starts_at || null, ends_at || null]
  );
  sendCreated(res, null, 'Banner created');
});

/** PUT /banners/:id — admin */
const updateBanner = asyncHandler(async (req, res) => {
  const { title, subtitle, link, position, sort_order, is_active } = req.body;
  const fields = []; const params = [];
  if (title !== undefined) { fields.push('title = ?'); params.push(title); }
  if (subtitle !== undefined) { fields.push('subtitle = ?'); params.push(subtitle); }
  if (link !== undefined) { fields.push('link = ?'); params.push(link); }
  if (position !== undefined) { fields.push('position = ?'); params.push(position); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (fields.length) { params.push(req.params.id); await query(`UPDATE banners SET ${fields.join(', ')} WHERE id = ?`, params); }
  sendSuccess(res, null, 'Banner updated');
});

/** DELETE /banners/:id — admin */
const deleteBanner = asyncHandler(async (req, res) => {
  await query('DELETE FROM banners WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'Banner deleted');
});

// ─── VIDEO ────────────────────────────────────────────────────────────────────

/** GET /videos */
const listVideos = asyncHandler(async (req, res) => {
  const { all, page, limit, random, cursor: cursorParam } = req.query;

  const where = all === '1' ? '' : 'WHERE is_active = 1';

  // Cursor mode: stable keyset pagination by id (for infinite video reels)
  if (cursorParam) {
    const { cursor, limit: lim } = getCursorPagination(req.query, 10);
    const keyset = cursor ? ' AND id < ?' : '';
    const videos = await queryRows(
      `SELECT * FROM videos ${where}${keyset} ORDER BY id DESC LIMIT ?`,
      [...(cursor ? [cursor.id] : []), parseInt(lim) + 1]
    );
    const hasMore = videos.length > parseInt(lim);
    if (hasMore) videos.pop();
    const last = videos[videos.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.id, last.id) : null;
    const [row] = await queryRows(`SELECT COUNT(*) as total FROM videos ${where}`);
    return sendSuccess(res, { videos, total: row?.total || 0, limit: parseInt(lim), nextCursor, hasMore });
  }

  if (page || limit || random === '1') {
    const { page: pg, limit: lim, offset } = getPagination(req.query, 10);
    const order = random === '1' ? 'ORDER BY RAND()' : 'ORDER BY sort_order, id DESC';
    const videos = await queryRows(`SELECT * FROM videos ${where} ${order} LIMIT ? OFFSET ?`, [lim, offset]);
    const [{ total }] = await queryRows(`SELECT COUNT(*) as total FROM videos ${where}`);
    return sendPaginated(res, { data: videos, total, page: pg, limit: lim });
  }

  const videos = await queryRows(`SELECT * FROM videos ${where} ORDER BY sort_order, id DESC`);
  sendSuccess(res, videos);
});

/** POST /videos — admin */
const createVideo = asyncHandler(async (req, res) => {
  const { title, description, url, thumbnail, type, sort_order } = req.body;
  await query(
    'INSERT INTO videos (title, description, url, thumbnail, type, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [title, description || null, url, thumbnail || null, type || 'youtube', sort_order || 0]
  );
  sendCreated(res, null, 'Video added');
});

/** PUT /videos/:id — admin */
const updateVideo = asyncHandler(async (req, res) => {
  const { title, url, thumbnail, is_active, sort_order } = req.body;
  const fields = []; const params = [];
  if (title !== undefined) { fields.push('title = ?'); params.push(title); }
  if (url !== undefined) { fields.push('url = ?'); params.push(url); }
  if (thumbnail !== undefined) { fields.push('thumbnail = ?'); params.push(thumbnail); }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
  if (fields.length) { params.push(req.params.id); await query(`UPDATE videos SET ${fields.join(', ')} WHERE id = ?`, params); }
  sendSuccess(res, null, 'Video updated');
});

/** DELETE /videos/:id — admin */
const deleteVideo = asyncHandler(async (req, res) => {
  await query('DELETE FROM videos WHERE id = ?', [req.params.id]);
  sendSuccess(res, null, 'Video deleted');
});

// ─── NOTIFICATION ─────────────────────────────────────────────────────────────

/** GET /notifications */
const listNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await notificationService.getUserNotifications(req.user.id, +page, +limit);
  sendPaginated(res, { ...result, message: 'Notifications fetched' });
});

/** GET /notifications/unread-count */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  sendSuccess(res, { count });
});

/** PATCH /notifications/:id/read */
const markAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user.id);
  sendSuccess(res, null, 'Notification marked as read');
});

/** PATCH /notifications/read-all */
const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  sendSuccess(res, null, 'All notifications marked as read');
});

/** DELETE /notifications/:id */
const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user.id);
  sendSuccess(res, null, 'Notification deleted');
});

// ─── SUPPORT ──────────────────────────────────────────────────────────────────

/** POST /support/tickets */
const createTicket = asyncHandler(async (req, res) => {
  const { subject, category, orderId, message, priority } = req.body;
  const ticketId = uuidv4();
  await query(
    "INSERT INTO support_tickets (id, user_id, order_id, subject, category, priority, status) VALUES (?, ?, ?, ?, ?, ?, 'open')",
    [ticketId, req.user.id, orderId || null, subject, category || 'other', priority || 'medium']
  );
  if (message) {
    await query(
      'INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?)',
      [ticketId, req.user.id, req.user.role, message]
    );
  }
  sendCreated(res, { ticketId }, 'Support ticket created');
});

/** GET /support/tickets */
const listTickets = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  let tickets;
  if (isAdmin) {
    const { status, priority } = req.query;
    const cond = [];
    const params = [];
    if (status) { cond.push('st.status = ?'); params.push(status); }
    if (priority) { cond.push('st.priority = ?'); params.push(priority); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    tickets = await queryRows(
      `SELECT st.*, u.name as customer_name, u.email FROM support_tickets st JOIN users u ON st.user_id = u.id
       ${where} ORDER BY st.created_at DESC LIMIT 100`, params
    );
  } else {
    tickets = await queryRows(
      'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
  }
  sendSuccess(res, tickets);
});

/** GET /support/tickets/:id */
const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await queryOne('SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
  const messages = await queryRows(
    `SELECT tm.*, u.name as sender_name, u.avatar FROM ticket_messages tm
     JOIN users u ON tm.sender_id = u.id WHERE tm.ticket_id = ? ORDER BY tm.created_at`,
    [req.params.id]
  );
  sendSuccess(res, { ...ticket, messages });
});

/** POST /support/tickets/:id/reply */
const replyToTicket = asyncHandler(async (req, res) => {
  const { message } = req.body;
  await query(
    'INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?)',
    [req.params.id, req.user.id, req.user.role, message]
  );
  broadcastTicketMessage(req.params.id, {
    ticket_id: req.params.id,
    sender_id: req.user.id,
    sender_role: req.user.role,
    message,
    created_at: new Date().toISOString(),
  });
  if (req.user.role === 'admin') {
    await query("UPDATE support_tickets SET status = 'in_progress' WHERE id = ? AND status = 'open'", [req.params.id]);
    const ticket = await queryOne('SELECT user_id, subject FROM support_tickets WHERE id = ?', [req.params.id]);
    if (ticket && ticket.user_id !== req.user.id) {
      try {
        await notificationService.createNotification(ticket.user_id, {
          title: 'Support Replied',
          message: `Support responded to your ticket "${ticket.subject}".`,
          type: 'system',
          referenceId: req.params.id,
          referenceType: 'support',
        });
      } catch (e) {}
    }
  }
  sendCreated(res, null, 'Reply sent');
});

/** PATCH /support/tickets/:id/close — admin */
const closeTicket = asyncHandler(async (req, res) => {
  await query("UPDATE support_tickets SET status = 'closed' WHERE id = ?", [req.params.id]);
  sendSuccess(res, null, 'Ticket closed');
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────

/** GET /reports/sales */
const getSalesReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];
  const data = await queryRows(
    `SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total) as revenue, SUM(discount) as discounts
     FROM orders WHERE payment_status = 'paid' AND DATE(created_at) BETWEEN ? AND ?
     GROUP BY DATE(created_at) ORDER BY date`, [fromDate, toDate]
  );
  sendSuccess(res, data);
});

/** GET /reports/vendors */
const getVendorsReport = asyncHandler(async (req, res) => {
  const data = await queryRows(
    `SELECT v.store_name, u.email, v.kyc_status, v.total_sales, v.rating,
      COUNT(DISTINCT oi.order_id) as orders, SUM(oi.commission_amount) as commission
     FROM vendors v JOIN users u ON v.user_id = u.id
     LEFT JOIN order_items oi ON v.id = oi.vendor_id
     GROUP BY v.id ORDER BY v.total_sales DESC LIMIT 100`
  );
  sendSuccess(res, data);
});

/** GET /reports/users */
const getUsersReport = asyncHandler(async (req, res) => {
  const data = await queryRows(
    `SELECT DATE(created_at) as date, COUNT(*) as new_users
     FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY DATE(created_at) ORDER BY date`
  );
  sendSuccess(res, data);
});

// ─── FESTIVAL SALE (Public) ───────────────────────────────────────────────────

/** GET /festival-sales/active */
const getActiveFestivalSales = asyncHandler(async (req, res) => {
  const sales = await queryRows(
    `SELECT * FROM festival_sales
     WHERE is_active = 1 AND starts_at <= NOW() AND ends_at >= NOW()
     ORDER BY starts_at DESC`
  );
  sendSuccess(res, sales);
});

module.exports = {
  listBanners, createBanner, updateBanner, deleteBanner,
  listVideos, createVideo, updateVideo, deleteVideo,
  listNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification,
  createTicket, listTickets, getTicketById, replyToTicket, closeTicket,
  getSalesReport, getVendorsReport, getUsersReport,
  getActiveFestivalSales,
};
