import express from "express";
import { createSuperAdmin, loginUser } from "../controllers/auth.controller";

const router = express.Router();

/**
 * @tags Auth
 * @summary Auth create-superadmin endpoint
 */
router.post("/auth/create-superadmin", createSuperAdmin);


/**
 * @tags Auth
 * @summary Auth login endpoint
 */
// @ts-ignore
router.post("/auth/login", loginUser);

export default router;
