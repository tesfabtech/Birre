
import { Router, type Request } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/require-auth.js';

const router = Router();

type AuthenticatedRequest = Request & {
  user?: {
    uid?: string;
  };
};

function getFirebaseUid(req: Request): string | null {
  const uid = req.firebaseUser?.uid;

  return typeof uid === 'string' && uid.length > 0 ? uid : null;
}

function getCategoryId(req: Request): string | null {
  const id: unknown = req.params.id;

  return typeof id === 'string' && id.trim().length > 0
    ? id.trim()
    : null;
}

async function findAuthenticatedUser(firebaseUid: string) {
  return prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
}

/**
 * GET /categories
 * Return active categories owned by the authenticated user.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const firebaseUid = getFirebaseUid(req);

    if (!firebaseUid) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const user = await findAuthenticatedUser(firebaseUid);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const categories = await prisma.category.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.json(categories);
  } catch (error) {
    console.error('GET /categories error:', error);
    return res.status(500).json({ message: 'Failed to load categories.' });
  }
});

/**
 * POST /categories
 * Create a category or report that its name is already in the trash.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const firebaseUid = getFirebaseUid(req);

    if (!firebaseUid) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const user = await findAuthenticatedUser(firebaseUid);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const rawName: unknown = req.body?.name;

    if (typeof rawName !== 'string' || !rawName.trim()) {
      return res.status(400).json({
        message: 'Category name is required.',
      });
    }

    const name = rawName.trim();

    if (name.length > 100) {
      return res.status(400).json({
        message: 'Category name cannot exceed 100 characters.',
      });
    }

    const existing = await prisma.category.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name,
        },
      },
    });

    if (existing) {
      if (!existing.isActive) {
        return res.status(409).json({
          code: 'CATEGORY_IN_TRASH',
          message: 'This category is already in the trash.',
          category: {
            id: existing.id,
            name: existing.name,
            deletedAt: existing.deletedAt,
          },
        });
      }

      return res.status(409).json({
        code: 'CATEGORY_ALREADY_EXISTS',
        message: 'This category already exists.',
      });
    }

    const category = await prisma.category.create({
      data: {
        userId: user.id,
        name,
        isDefault: false,
        isActive: true,
      },
    });

    return res.status(201).json(category);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return res.status(409).json({
        code: 'CATEGORY_ALREADY_EXISTS',
        message: 'This category already exists.',
      });
    }

    console.error('POST /categories error:', error);
    return res.status(500).json({ message: 'Failed to create category.' });
  }
});

/**
 * DELETE /categories/:id
 * Soft-delete a category without deleting its expenses.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const firebaseUid = getFirebaseUid(req);
    const categoryId = getCategoryId(req);

    if (!firebaseUid) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!categoryId) {
      return res.status(400).json({
        message: 'A valid category ID is required.',
      });
    }

    const user = await findAuthenticatedUser(firebaseUid);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
        isActive: true,
      },
    });

    if (!category) {
      return res.status(404).json({
        message: 'Category not found or already in the trash.',
      });
    }

    if (category.isDefault) {
      return res.status(403).json({
        message: 'Default categories cannot be deleted.',
      });
    }

    const deletedAt = new Date();

    const result = await prisma.category.updateMany({
      where: {
        id: categoryId,
        userId: user.id,
        isActive: true,
        isDefault: false,
      },
      data: {
        isActive: false,
        deletedAt,
      },
    });

    if (result.count !== 1) {
      return res.status(409).json({
        message: 'Category changed during deletion. Please refresh and try again.',
      });
    }

    return res.json({
      message: 'Category moved to trash. It will be permanently deleted after 30 days.',
      category: {
        id: category.id,
        name: category.name,
        isActive: false,
        deletedAt,
      },
    });
  } catch (error) {
    console.error('DELETE /categories/:id error:', error);
    return res.status(500).json({ message: 'Failed to delete category.' });
  }
});

/**
 * POST /categories/:id/restore
 * Restore a deleted category belonging to the authenticated user.
 */
router.post('/:id/restore', requireAuth, async (req, res) => {
  try {
    const firebaseUid = getFirebaseUid(req);
    const categoryId = getCategoryId(req);

    if (!firebaseUid) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!categoryId) {
      return res.status(400).json({
        message: 'A valid category ID is required.',
      });
    }

    const user = await findAuthenticatedUser(firebaseUid);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
        isActive: false,
      },
    });

    if (!category) {
      return res.status(404).json({
        message: 'Category not found in the trash.',
      });
    }

    const conflict = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: category.name,
        isActive: true,
        NOT: { id: categoryId },
      },
      select: { id: true },
    });

    if (conflict) {
      return res.status(409).json({
        code: 'CATEGORY_NAME_CONFLICT',
        message: 'An active category with this name already exists.',
      });
    }

    const result = await prisma.category.updateMany({
      where: {
        id: categoryId,
        userId: user.id,
        isActive: false,
      },
      data: {
        isActive: true,
        deletedAt: null,
      },
    });

    if (result.count !== 1) {
      return res.status(409).json({
        message: 'Category changed during restoration. Please refresh and try again.',
      });
    }

    const restoredCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
        isActive: true,
      },
    });

    return res.json({
      message: 'Category restored successfully.',
      category: restoredCategory,
    });
  } catch (error) {
    console.error('POST /categories/:id/restore error:', error);
    return res.status(500).json({ message: 'Failed to restore category.' });
  }
});

/**
 * GET /categories/trash
 * List deleted categories owned by the authenticated user.
 */
router.get('/trash', requireAuth, async (req, res) => {
  try {
    const firebaseUid = getFirebaseUid(req);

    if (!firebaseUid) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const user = await findAuthenticatedUser(firebaseUid);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const categories = await prisma.category.findMany({
      where: {
        userId: user.id,
        isActive: false,
      },
      orderBy: { deletedAt: 'desc' },
    });

    return res.json(categories);
  } catch (error) {
    console.error('GET /categories/trash error:', error);
    return res.status(500).json({ message: 'Failed to load deleted categories.' });
  }
});

export default router;
