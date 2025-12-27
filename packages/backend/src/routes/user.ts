import { Hono } from 'hono';
import { UserService } from '../services/user';
import { authMiddleware } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const user = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All user routes require authentication
user.use('*', authMiddleware);

// GET /api/user/profile
user.get('/profile', async (c) => {
  const currentUser = c.get('user');
  const db = c.get('db');
  const service = new UserService(db);

  const profile = await service.getProfile(currentUser.id);

  if (!profile) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(profile);
});

// GET /api/user/stats
user.get('/stats', async (c) => {
  const currentUser = c.get('user');
  const db = c.get('db');
  const service = new UserService(db);

  const stats = await service.getStats(currentUser.id);

  return c.json(stats);
});

// GET /api/user/export
user.get('/export', async (c) => {
  const currentUser = c.get('user');
  const format = c.req.query('format') || 'json';
  const db = c.get('db');
  const service = new UserService(db);

  try {
    if (format === 'csv') {
      const csvData = await service.exportDataAsCSV(currentUser.id);
      const filename = `health-data-${new Date().toISOString().split('T')[0]}.csv`;

      return new Response(csvData, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Default: JSON
    const data = await service.exportData(currentUser.id);
    const filename = `health-data-${new Date().toISOString().split('T')[0]}.json`;

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return c.json({ error: 'Export failed' }, 500);
  }
});

// DELETE /api/user/account
user.delete('/account', async (c) => {
  const currentUser = c.get('user');
  const db = c.get('db');
  const service = new UserService(db);

  try {
    await service.deleteAccount(currentUser.id);

    // Clear session/cookie if applicable
    return c.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

export { user };
