import express from 'express';
import { authorizeSuperAdmin } from '../../packages/midleware/authorizeSuperAdmin';
import { getAllUsers, getAllUsersByOrganization, handleInvitationLink, sendInviteLink } from '../controllers/user.controller';
import { verifyAccessToken } from '../../packages/midleware/authMiddleware';


const router = express.Router();

// @ts-ignore
router.get("/users/all",authorizeSuperAdmin, getAllUsers);
// @ts-ignore
router.get('/users/by-org',verifyAccessToken, getAllUsersByOrganization);
// @ts-ignore
router.post('/users/invite-user',verifyAccessToken, sendInviteLink);
// @ts-ignore
router.post('/users/invite-user/verify',verifyAccessToken, handleInvitationLink);


export default router;
