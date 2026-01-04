import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { UserService } from '../services/user';
import { AIUsageService } from '../services/ai-usage';
import { authMiddleware } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).optional().default('json'),
});

// Chain format for RPC type inference
// All user routes require authentication
export const user = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .use(authMiddleware)
  .get('/profile', async (c) => {
    const currentUser = c.get('user');
    const db = c.get('db');
    const service = new UserService(db);

    const profile = await service.getProfile(currentUser.id);

    if (!profile) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(profile);
  })
  .get('/stats', async (c) => {
    const currentUser = c.get('user');
    const db = c.get('db');
    const service = new UserService(db);

    const stats = await service.getStats(currentUser.id);

    return c.json(stats);
  })
  .get('/export', zValidator('query', exportQuerySchema), async (c) => {
    const currentUser = c.get('user');
    const { format } = c.req.valid('query');
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
  })
  .delete('/account', async (c) => {
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
  })
  .get('/ai-usage', async (c) => {
    const currentUser = c.get('user');
    const db = c.get('db');
    const service = new AIUsageService(db);

    const summary = await service.getSummary(currentUser.id);

    return c.json(summary);
  });
