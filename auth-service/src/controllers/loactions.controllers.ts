import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import Organization from "../models/organisation";

export const addLocationForOrg = async (req: Request, res: Response) => {
  try {
    const orgId = req.headers["orgid"];
    if (!orgId || typeof orgId !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "orgId is required in headers" });
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    const { name, type, address, phone, email, isActive } = req.body;

    // Create a new location object.
    const newLocation = {
      name,
      type,
      address,
      phone,
      email,
      isActive: isActive || true, // Default to true if not provided.
    };

    // Add the new location to the organization's locations array.
    organization.locations.push(newLocation);
    await organization.save();

    res.status(201).json({
      message: "Location added successfully",
      location: newLocation,
      success: true, // You can return success as true for proper status handling
    });
  } catch (error) {
    console.error("Error adding location:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};
export const getAllLocationsForOrg = async (req: Request, res: Response) => {
  try {
    const orgId = req.headers["orgid"];

    if (!orgId || typeof orgId !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "orgId is required in headers" });
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

     // Get pagination parameters from query (default page 1, limit 10)
     const page = req.query.page && typeof req.query.page === "string" 
     ? parseInt(req.query.page) 
     : 1;
   const limit = req.query.limit && typeof req.query.limit === "string" 
     ? parseInt(req.query.limit) 
     : 10;
   const skip = (page - 1) * limit;

   // Get search query for location name from query, ensure it's a string
   const nameSearch = typeof req.query.name === "string" ? req.query.name : "";

   // Filter locations based on name if a search term is provided
   const locations = organization.locations.filter((location) =>
     location.name.toLowerCase().includes(nameSearch.toLowerCase())
   );

    // Apply pagination to the filtered locations
    const paginatedLocations = locations.slice(skip, skip + limit);

    // Create response object with pagination info
    const response = {
      success: true,
      page: page,
      totalPages: Math.ceil(locations.length / limit),
      totalLocations: locations.length,
      locations: paginatedLocations,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const getLocationIdForOrg = async (req: Request, res: Response) => {
  try {
    const orgId = req.headers["orgid"]; // Extract orgId from headers
    const locationId = req.params.locationId; // Extract locationId from route  const orgId = req.headers["orgid"];
    if (!orgId || typeof orgId !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "orgId is required in headers" });
    }

    if (!locationId || !mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid locationId",
      });
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Find the location by locationId within the organization's locations array
    const location = organization.locations.find(
      (loc) => loc.toString() === locationId
    );
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found in this organization",
      });
    }

    // Return the found location
    res.status(200).json({
      success: true,
      location: location,
    });
  } catch (error) {
    console.error("Error fetching location by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const updateLocationInOrg = async (req: Request, res: Response) => {
  try {
    const orgId = req.headers["orgid"]; // Extract orgId from headers
    const { locationId } = req.params; // Location ID from route parameter
    const { name, type, address, phone, email, isActive } = req.body;

    if (!orgId || typeof orgId !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "orgId is required in headers" });
    }
    if (!locationId || !mongoose.Types.ObjectId.isValid(locationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid locationId" });
    }

    const organization = await Organization.findById(orgId) as any;
    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    // Find the location in the organization's locations array
    const locationIndex = organization.locations.findIndex(
      (loc) => loc._id.toString() === locationId
    );
    if (locationIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    // Update the location
    organization.locations[locationIndex] = {
      ...organization.locations[locationIndex],
      name,
      type,
      address,
      phone,
      email,
      isActive,
    };

    await organization.save();

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      location: organization.locations[locationIndex],
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
export const deleteLocationFromOrg = async (req: Request, res: Response) => {
  try {
    const orgId = req.headers["orgid"]; // Extract orgId from headers
    const { locationId } = req.params; // Location ID from route parameter

    if (!orgId || typeof orgId !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "orgId is required in headers" });
    }
    if (!locationId || !mongoose.Types.ObjectId.isValid(locationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid locationId" });
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    // Find the index of the location to be deleted
    const locationIndex = organization.locations.findIndex(
      (loc) => loc._id.toString() === locationId
    );
    if (locationIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    // Remove the location from the locations array
    organization.locations.splice(locationIndex, 1);
    await organization.save();

    res
      .status(200)
      .json({ success: true, message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error deleting location:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};