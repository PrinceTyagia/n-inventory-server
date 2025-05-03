import express from 'express';
import { verifyAccessToken } from '../packages/midleware/authMiddleware';
import { createRoleForOrganization, deleteRoleByOrgAndRoleId, getRoleByOrgAndRoleId, getRolesByOrgId, updateRoleByOrgAndRoleId } from '../controllers/roles.controllers';

const router = express.Router();

// @ts-ignore
router.get('/org/roles/all-roles',verifyAccessToken, getRolesByOrgId)
// @ts-ignore
router.post("/org/roles/create-role",verifyAccessToken, createRoleForOrganization)
// @ts-ignore
router.get("/org/roles/:roleId",verifyAccessToken, getRoleByOrgAndRoleId)
// @ts-ignore
router.put("/org/roles/update",verifyAccessToken, updateRoleByOrgAndRoleId)
// @ts-ignore
router.delete("/org/roles/:roleId",verifyAccessToken, deleteRoleByOrgAndRoleId)


export default router;