import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'reachinbox_super_secret_jwt_key_2026';
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(googleClientId);

/**
 * Real Google OAuth verification endpoint.
 * Accepts Google ID Token from Google Identity Services button on frontend.
 */
router.post('/google', async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Google credential token is required' });
  }

  try {
    let email: string;
    let name: string;
    let avatar: string | undefined;
    let googleId: string;

    if (googleClientId) {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ error: 'Failed to extract profile from Google token' });
      }
      email = payload.email;
      name = payload.name || payload.email.split('@')[0];
      avatar = payload.picture;
      googleId = payload.sub;
    } else {
      // Decode JWT payload directly if Google Client ID not yet set in .env
      const decoded: any = jwt.decode(credential);
      if (!decoded || !decoded.email) {
        return res.status(400).json({ error: 'Invalid Google credential token' });
      }
      email = decoded.email;
      name = decoded.name || decoded.email.split('@')[0];
      avatar = decoded.picture;
      googleId = decoded.sub || 'google-' + Date.now();
    }

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, avatar, googleId },
      create: { email, name, avatar, googleId },
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    console.error('Google OAuth verification failed:', error?.message || error);
    return res.status(401).json({ error: 'Google authentication failed: ' + (error?.message || 'Invalid token') });
  }
});

/**
 * 1-Click Demo Login (for evaluators or fast review).
 */
router.post('/demo', async (req: Request, res: Response) => {
  try {
    const demoEmail = 'mitrajit@reachinbox.ai';
    const demoName = 'Mitrajit Chandra (Evaluator)';
    const demoAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    const user = await prisma.user.upsert({
      where: { email: demoEmail },
      update: { name: demoName, avatar: demoAvatar },
      create: {
        email: demoEmail,
        name: demoName,
        avatar: demoAvatar,
        googleId: 'demo-evaluator-id',
      },
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create demo session: ' + error.message });
  }
});

/**
 * Get current authenticated user profile
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

export default router;
