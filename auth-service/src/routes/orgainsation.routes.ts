import express from 'express';
import { createOrganization,  deleteOrganizationAndUsers, getAllOrganizations,  getOrganizationById,  getTrialStatusById, verifyOtpOrganization } from '../controllers/organisation.controllers';
import { authorizeSuperAdmin } from '../../packages/midleware/authorizeSuperAdmin';
import { verifyAccessToken } from '../../packages/midleware/authMiddleware';


const router = express.Router();

// @ts-ignore
router.post("/org/create-org", createOrganization);
// @ts-ignore
router.post("/org/verify-otp", verifyOtpOrganization);
// @ts-ignore
router.get("/org/all-org", authorizeSuperAdmin, getAllOrganizations);
// @ts-ignore
router.get('/org/:orgId', verifyAccessToken, getOrganizationById);
// @ts-ignore
router.delete('/org/:orgId',verifyAccessToken, deleteOrganizationAndUsers)
// @ts-ignore
router.get('/org/:orgId/trial-status', getTrialStatusById);





export default router;
