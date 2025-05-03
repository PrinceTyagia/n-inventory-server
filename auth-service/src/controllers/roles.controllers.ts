import { Request, Response } from "express";
import mongoose from "mongoose";
import Organization from "../models/organisation";
//Step 1 Get All Role by Organization
const getRolesByOrgId = async (req: Request, res: Response) => {
  const orgId = req.headers["orgid"] as string;
  // console.log("orgid",orgId);
  try {
    if (!orgId || typeof orgId !== "string") {
      return res.status(400).json({
        success: false,
        message: "orgId is required in headers and must be a string.",
      });
    }
    const { page = 1, limit = 10, search = "" } = req.query;
    const organization = await Organization.findById(orgId);
    // console.log("organization",organization);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found sss.",
      });
    }

    const searchString = typeof search === "string" ? search.toLowerCase() : "";

    const allRoles = organization.roles || [];
    const filteredRoles = allRoles.filter((role) =>
      role.roleName.toLowerCase().includes(searchString)
    );

    const totalRoles = filteredRoles.length;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const totalPages = Math.ceil(totalRoles / limitNumber);
    const startIndex = (pageNumber - 1) * limitNumber;
    const paginatedRoles = filteredRoles.slice(
      startIndex,
      startIndex + limitNumber
    );

    return res.status(200).json({
      success: true,
      message: "Roles fetched successfully.",
      roles: paginatedRoles,
      page: pageNumber,
      totalRoles,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching roles.",
    });
  }
};
// Step 2 create Role for Organization
const createRoleForOrganization = async (req: Request, res: Response) => {
  const orgId = req.headers["orgid"] as string; // Get orgId from headers
  const { roleName, description, permissions } = req.body;
  const createdBy = req.user?.userId; // Assuming that user ID is available after verifying the token

  // Validate createdBy and orgId
  if (!createdBy || typeof createdBy !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "CreatedBy is required" });
  }

  if (!orgId || typeof orgId !== "string") {
    return res
      .status(400)
      .json({
        success: false,
        message: "Organization ID is required in headers",
      });
  }

  // Validate roleName
  if (!roleName) {
    return res
      .status(400)
      .json({ success: false, message: "Role name is required" });
  }

  try {
    // Find the organization by orgId
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    // Check if role already exists within the organization's roles array
    const roleExists = organization.roles.some(
      (role) => role.roleName.toLowerCase() === roleName.toLowerCase()
    );
    if (roleExists) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Role name already exists in this organization",
        });
    }

    // Create new role
    const newRole = {
      roleName,
      description,
      permissions,
      createdBy,
      createdAt: new Date(),
    };

    // Add the new role to the organization's roles array
    organization.roles.push(newRole);

    // Save the organization with the new role
    await organization.save();

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      role: newRole,
    });
  } catch (error) {
    console.error("Error creating role:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
//Step 3 get Role by Id and Org ID
const getRoleByOrgAndRoleId = async (req: Request, res: Response) => {
  const orgId = req.headers["orgid"];
  const { roleId } = req.params;

  if (!orgId || typeof orgId !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "orgId is required in headers" });
  }

  if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or missing roleId" });
  }

  try {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found sss" });
    }

    const role = organization.roles.id(roleId); // Mongoose subdocument access

    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Role fetched successfully",
      role,
    });
  } catch (error) {
    console.error("Error fetching role:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
//Step 4 Update Role by ORG Id and Role Id
const updateRoleByOrgAndRoleId = async (req: Request, res: Response) => {
  const orgId = req.headers["orgid"];

  const { roleName, description, permissions, roleId } = req.body;

  if (!orgId || typeof orgId !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "orgId is required in headers" });
  }

  if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or missing roleId" });
  }

  try {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    const role = organization.roles.id(roleId);
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    // Update fields if provided
    if (roleName) role.roleName = roleName;
    if (description !== undefined) role.description = description;
    if (Array.isArray(permissions)) role.permissions = permissions;

    await organization.save();

    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
      role,
    });
  } catch (error) {
    console.error("Error updating role:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
//Step 5 Delete Role by ORG Id and Role Id
const deleteRoleByOrgAndRoleId = async (req: Request, res: Response) => {
  const orgId = req.headers["orgid"];
  const { roleId } = req.params;

  if (!orgId || typeof orgId !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "orgId is required in headers" });
  }

  if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or missing roleId" });
  }

  try {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    const roleIndex = organization.roles.findIndex(
      (role: any) => role._id.toString() === roleId
    );
    if (roleIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    organization.roles.splice(roleIndex, 1); // remove role from array
    await organization.save();

    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export {  getRolesByOrgId,
    createRoleForOrganization,
    getRoleByOrgAndRoleId,
    updateRoleByOrgAndRoleId,
    deleteRoleByOrgAndRoleId,}