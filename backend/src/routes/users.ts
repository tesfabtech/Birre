
import { Router } from 'express';
import { BucketType, Prisma } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import { firebaseAdminAuth } from '../lib/firebase-admin.js';
import { requireAuth } from '../middleware/require-auth.js';

const router = Router();

const DEFAULT_BUCKETS = [
  { name: 'Essential', type: BucketType.ESSENTIAL, percentage: '50' },
  { name: 'Flexible', type: BucketType.FLEXIBLE, percentage: '25' },
  { name: 'Investment', type: BucketType.INVESTMENT, percentage: '10' },
  { name: 'Emergency', type: BucketType.EMERGENCY, percentage: '10' },
  { name: 'Buffer', type: BucketType.BUFFER, percentage: '5' },
  { name: 'Unallocated', type: BucketType.UNALLOCATED },
] as const;

const RECOMMENDED_BUCKET_TYPES: BucketType[] = [
  BucketType.ESSENTIAL,
  BucketType.FLEXIBLE,
  BucketType.INVESTMENT,
  BucketType.EMERGENCY,
  BucketType.BUFFER,
];

/**
 * Checks whether the authenticated Firebase identity has
 * an existing Birre profile. Does not create anything.
 */
router.get('/account-status', requireAuth, async (req, res) => {
  try {
    const profile = await prisma.user.findUnique({
      where: { firebaseUid: req.firebaseUser!.uid },
      select: { id: true },
    });

    return res.json({ exists: Boolean(profile) });
  } catch (error) {
    console.error('Failed to check account status:', error);

    return res.status(500).json({
      message: 'Failed to check account status.',
    });
  }
});

/**
 * Creates a new Birre profile only after explicit sign-up.
 * The profile, default buckets, allocation plan and rules
 * are initialized in one database transaction.
 */
router.post('/signup', requireAuth, async (req, res) => {
  const firebaseUser = req.firebaseUser!;
  const firebaseUid = firebaseUser.uid;
  const email = firebaseUser.email ?? null;
  const name =
    firebaseUser.name || email?.split('@')[0] || 'Birre User';

  try {
    const user = await prisma.$transaction(async tx => {
      const existingProfile = await tx.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      if (existingProfile) {
        const error = new Error('BIRRE_ACCOUNT_EXISTS');
        throw error;
      }

      const profile = await tx.user.create({
        data: {
          firebaseUid,
          email,
          name,
          budgetSetupCompleted: true,
        },
      });

      const buckets = await tx.bucket.createManyAndReturn({
        data: DEFAULT_BUCKETS.map(item => ({
          userId: profile.id,
          name: item.name,
          type: item.type,
          isActive: true,
        })),
        select: { id: true, name: true, type: true },
      });

      const bucketByType = new Map(
        buckets.map(bucket => [bucket.type, bucket]),
      );

      const plan = await tx.allocationPlan.create({
        data: {
          userId: profile.id,
          name: 'Default Plan',
        },
      });

      const rules = RECOMMENDED_BUCKET_TYPES.flatMap(type => {
        const bucket = bucketByType.get(type);
        const item = DEFAULT_BUCKETS.find(
          candidate => candidate.type === type,
        );

        if (!bucket || !item || !('percentage' in item)) {
          return [];
        }

        return [{
          allocationPlanId: plan.id,
          bucketId: bucket.id,
          percentage: new Prisma.Decimal(item.percentage),
        }];
      });

      if (rules.length !== RECOMMENDED_BUCKET_TYPES.length) {
        throw new Error('DEFAULT_ALLOCATION_SETUP_FAILED');
      }

      await tx.allocationRule.createMany({
        data: rules,
        skipDuplicates: true,
      });

      return profile;
    });

    return res.status(201).json({
      message: 'Birre account created successfully.',
      user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'BIRRE_ACCOUNT_EXISTS') {
      return res.status(409).json({
        message: 'A Birre account already exists. Please sign in instead.',
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return res.status(409).json({
        message:
          'This email or Firebase identity is already associated with a Birre account.',
      });
    }

    console.error('Failed to create Birre account:', error);

    return res.status(500).json({
      message: 'Failed to create your Birre account.',
    });
  }
});

/**
 * Returns and repairs an EXISTING Birre profile.
 * It never creates a new user.
 */
router.get('/me', requireAuth, async (req, res) => {
  const firebaseUser = req.firebaseUser!;
  const firebaseUid = firebaseUser.uid;
  const email = firebaseUser.email ?? null;
  const name =
    firebaseUser.name || email?.split('@')[0] || 'Birre User';

  try {
    const user = await prisma.$transaction(async tx => {
      const profile = await tx.user.findUnique({
        where: { firebaseUid },
      });

      if (!profile) {
        return null;
      }

      const updatedProfile = await tx.user.update({
        where: { id: profile.id },
        data: {
          ...(email ? { email } : {}),
          name,
        },
      });

      const existingBuckets = await tx.bucket.findMany({
        where: { userId: updatedProfile.id },
        select: { id: true, name: true, type: true },
      });

      const bucketByType = new Map(
        existingBuckets.map(bucket => [bucket.type, bucket]),
      );

      for (const item of DEFAULT_BUCKETS) {
        if (bucketByType.has(item.type)) continue;

        const sameName = existingBuckets.find(
          bucket =>
            bucket.name.toLowerCase() === item.name.toLowerCase(),
        );

        if (sameName) continue;

        const created = await tx.bucket.create({
          data: {
            userId: updatedProfile.id,
            name: item.name,
            type: item.type,
            isActive: true,
          },
          select: { id: true, name: true, type: true },
        });

        existingBuckets.push(created);
        bucketByType.set(created.type, created);
      }

      let plan = await tx.allocationPlan.findFirst({
        where: { userId: updatedProfile.id },
        orderBy: { createdAt: 'asc' },
      });

      if (!plan) {
        plan = await tx.allocationPlan.create({
          data: {
            userId: updatedProfile.id,
            name: 'Default Plan',
          },
        });
      }

      const existingRules = await tx.allocationRule.count({
        where: { allocationPlanId: plan.id },
      });

      if (existingRules === 0) {
        const recommendedRules = RECOMMENDED_BUCKET_TYPES.flatMap(type => {
          const bucket = bucketByType.get(type);
          const item = DEFAULT_BUCKETS.find(
            candidate => candidate.type === type,
          );

          if (!bucket || !item || !('percentage' in item)) {
            return [];
          }

          return [{
            allocationPlanId: plan!.id,
            bucketId: bucket.id,
            percentage: new Prisma.Decimal(item.percentage),
          }];
        });

        if (
          recommendedRules.length === RECOMMENDED_BUCKET_TYPES.length
        ) {
          await tx.allocationRule.createMany({
            data: recommendedRules,
            skipDuplicates: true,
          });
        }
      }

      if (!updatedProfile.budgetSetupCompleted) {
        return tx.user.update({
          where: { id: updatedProfile.id },
          data: { budgetSetupCompleted: true },
        });
      }

      return updatedProfile;
    });

    if (!user) {
      return res.status(404).json({
        message: 'Birre account not found. Please sign up first.',
      });
    }

    return res.json(user);
  } catch (error) {
    console.error('Failed to get or repair user profile:', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return res.status(409).json({
        message: 'This email is already associated with another Birre account.',
      });
    }

    return res.status(500).json({
      message: 'Failed to get user profile.',
    });
  }
});

/**
 * Permanently deletes the authenticated user's Birre data,
 * then deletes their Firebase Authentication identity.
 *
 * Firebase deletion failures can be retried by calling this
 * endpoint again before signing out.
 */
router.delete('/me', requireAuth, async (req, res) => {
  const firebaseUid = req.firebaseUser!.uid;

  try {
    await prisma.$transaction(async tx => {
      const profile = await tx.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });

      // Allows retrying Firebase deletion after DB cleanup succeeded.
      if (!profile) return;

      const userId = profile.id;

      await tx.allocation.deleteMany({
        where: {
          incomeTransaction: { userId },
        },
      });

      await tx.expense.deleteMany({ where: { userId } });
      await tx.transfer.deleteMany({ where: { userId } });
      await tx.goal.deleteMany({ where: { userId } });

      await tx.incomeTransaction.deleteMany({ where: { userId } });
      await tx.financialPeriod.deleteMany({ where: { userId } });
      await tx.moneySource.deleteMany({ where: { userId } });
      await tx.allocationPlan.deleteMany({ where: { userId } });

      await tx.bucket.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });

      await tx.user.delete({ where: { id: userId } });
    });
  } catch (error) {
    console.error('Failed to delete Birre database records:', error);

    return res.status(500).json({
      message:
        'Could not delete your Birre data. Your Firebase account was not deleted.',
      databaseDeleted: false,
    });
  }

  try {
    await firebaseAdminAuth.deleteUser(firebaseUid);

    return res.json({
      message: 'Your Birre account and associated data have been deleted.',
      databaseDeleted: true,
      firebaseDeleted: true,
    });
  } catch (error) {
    const firebaseError = error as { code?: string };

    if (firebaseError.code === 'auth/user-not-found') {
      return res.json({
        message: 'Your Birre account and associated data have been deleted.',
        databaseDeleted: true,
        firebaseDeleted: true,
      });
    }

    console.error(
      'Birre data deleted, but Firebase deletion failed:',
      error,
    );

    return res.status(500).json({
      message:
        'Your Birre data was deleted, but Firebase account deletion failed. Retry account deletion before signing out.',
      databaseDeleted: true,
      firebaseDeleted: false,
    });
  }
});

export default router;
