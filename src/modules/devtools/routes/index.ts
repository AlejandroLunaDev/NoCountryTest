import { Router } from 'express';
import { devTools } from '../index';

const router = Router();

/**
 * @swagger
 * /api/devtools/seed:
 *   post:
 *     summary: Poblar la base de datos con datos de prueba
 *     tags: [DevTools]
 *     responses:
 *       200:
 *         description: Base de datos poblada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Base de datos poblada exitosamente"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/seed', async (req, res, next) => {
  try {
    await devTools.seedDatabase();
    res.json({ success: true, message: 'Base de datos poblada exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/devtools/clean:
 *   post:
 *     summary: Limpiar todos los datos de la base de datos
 *     tags: [DevTools]
 *     responses:
 *       200:
 *         description: Base de datos limpiada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Base de datos limpiada exitosamente"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/clean', async (req, res, next) => {
  try {
    await devTools.cleanDatabase();
    res.json({ success: true, message: 'Base de datos limpiada exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/devtools/reset:
 *   post:
 *     summary: Reiniciar la base de datos (limpiar y poblar)
 *     tags: [DevTools]
 *     responses:
 *       200:
 *         description: Base de datos reiniciada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Base de datos reiniciada exitosamente"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/reset', async (req, res, next) => {
  try {
    await devTools.cleanDatabase();
    await devTools.seedDatabase();
    res.json({ success: true, message: 'Base de datos reiniciada exitosamente' });
  } catch (error) {
    next(error);
  }
});

export default router;