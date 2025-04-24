import { Router } from 'express';

const router = Router();

/**
 * @tags Health
 * @summary Health check endpoint
 */
router.get('/healthcheck', (req, res) => {
  res.status(200).send('Auth service healthy');
});

export default router;
