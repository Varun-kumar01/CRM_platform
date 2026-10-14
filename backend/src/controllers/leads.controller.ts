
import { Request, Response } from "express";
import { pool } from "../config/db";
import { AuthRequest } from "../middleware/auth";

const statuses = [
  "New", "Contacted", "Qualified", "Proposal", "Won", "Lost",
];

const fields = `
  id, name, email, phone, company_name AS "companyName",
  source, status, estimated_value AS "estimatedValue",
  notes, assigned_to AS "assignedTo",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

export async function getLeads(req: AuthRequest, res: Response) {
  const companyId = req.user!.companyId;
  const search = String(req.query.search || "").trim().slice(0, 100);
  const status = String(req.query.status || "");

  if (status && !statuses.includes(status)) {
    return res.status(400).json({ message: "Invalid lead status" });
  }

  try {
    const result = await pool.query(
      `SELECT ${fields} FROM leads
       WHERE company_id = $1
         AND ($2 = '' OR status = $2)
         AND (
           $3 = '' OR name ILIKE '%' || $3 || '%'
           OR COALESCE(email, '') ILIKE '%' || $3 || '%'
           OR COALESCE(company_name, '') ILIKE '%' || $3 || '%'
         )
       ORDER BY created_at DESC`,
      [companyId, status, search]
    );

    return res.json({ leads: result.rows });
  } catch (error) {
    console.error("Get leads failed:", error);
    return res.status(500).json({ message: "Unable to load leads" });
  }
}

export async function createLead(req: AuthRequest, res: Response) {
  const {
    name, email, phone, companyName, source,
    status, estimatedValue, notes, assignedTo,
  } = req.body;

  if (typeof name !== "string" || name.trim().length < 2 ||
      name.trim().length > 150) {
    return res.status(400).json({ message: "Lead name must be 2–150 characters" });
  }

  const optionalString = (value: unknown, max: number) =>
    value === undefined || value === null || value === "" ||
    (typeof value === "string" && value.trim().length <= max);

  if (
    !optionalString(email, 255) ||
    !optionalString(phone, 30) ||
    !optionalString(companyName, 150) ||
    !optionalString(source, 50) ||
    !optionalString(notes, 5000)
  ) {
    return res.status(400).json({ message: "One or more fields are too long" });
  }

  const leadStatus = status ?? "New";
  if (!statuses.includes(leadStatus)) {
    return res.status(400).json({ message: "Invalid lead status" });
  }

  const value = estimatedValue === undefined || estimatedValue === ""
    ? 0
    : Number(estimatedValue);

  if (!Number.isFinite(value) || value < 0 || value > 999999999999) {
    return res.status(400).json({ message: "Invalid estimated value" });
  }

  const assignedId = assignedTo ? Number(assignedTo) : null;
  if (assignedTo && (!Number.isSafeInteger(assignedId) || assignedId! <= 0)) {
    return res.status(400).json({ message: "Invalid assignee" });
  }

  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : null;
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  try {
    if (assignedId !== null) {
      const assignee = await pool.query(
        `SELECT id FROM users
         WHERE id = $1 AND company_id = $2 AND is_active = TRUE`,
        [assignedId, req.user!.companyId]
      );
      if (!assignee.rowCount) {
        return res.status(400).json({ message: "Invalid company user assignment" });
      }
    }

    const result = await pool.query(
      `INSERT INTO leads
        (company_id, assigned_to, name, email, phone, company_name,
         source, status, estimated_value, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING ${fields}`,
      [
        req.user!.companyId, assignedId, name.trim(), cleanEmail,
        phone?.trim() || null, companyName?.trim() || null,
        source?.trim() || "Other", leadStatus, value, notes?.trim() || null,
      ]
    );

    return res.status(201).json({
      message: "Lead created successfully",
      lead: result.rows[0],
    });
  } catch (error) {
    console.error("Create lead failed:", error);
    return res.status(500).json({ message: "Unable to create lead" });
  }
}

export async function updateLead(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid lead ID" });
  }

  const allowed = [
    "name", "email", "phone", "companyName", "source",
    "status", "estimatedValue", "notes", "assignedTo",
  ];

  const provided = Object.keys(req.body);
  if (!provided.length || provided.some((key) => !allowed.includes(key))) {
    return res.status(400).json({ message: "Invalid update fields" });
  }

  const current = await pool.query(
    `SELECT ${fields} FROM leads WHERE id = $1 AND company_id = $2`,
    [id, req.user!.companyId]
  );

  if (!current.rowCount) {
    return res.status(404).json({ message: "Lead not found" });
  }

  const old = current.rows[0];
  const merged = { ...old, ...req.body };

  if (typeof merged.name !== "string" ||
      merged.name.trim().length < 2 ||
      merged.name.trim().length > 150) {
    return res.status(400).json({ message: "Invalid lead name" });
  }

  if (!statuses.includes(merged.status)) {
    return res.status(400).json({ message: "Invalid lead status" });
  }

  const value = Number(merged.estimatedValue);
  if (!Number.isFinite(value) || value < 0 || value > 999999999999) {
    return res.status(400).json({ message: "Invalid estimated value" });
  }

  const email = merged.email || null;
  if (email && (
    typeof email !== "string" ||
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  for (const [key, max] of [
    ["phone", 30], ["companyName", 150], ["source", 50], ["notes", 5000],
  ] as const) {
    if (merged[key] != null &&
        (typeof merged[key] !== "string" || merged[key].length > max)) {
      return res.status(400).json({ message: `Invalid ${key}` });
    }
  }

  const assignedId = merged.assignedTo ? Number(merged.assignedTo) : null;
  if (assignedId !== null) {
    if (!Number.isSafeInteger(assignedId) || assignedId <= 0) {
      return res.status(400).json({ message: "Invalid assignee" });
    }
    const assignee = await pool.query(
      `SELECT id FROM users
       WHERE id = $1 AND company_id = $2 AND is_active = TRUE`,
      [assignedId, req.user!.companyId]
    );
    if (!assignee.rowCount) {
      return res.status(400).json({ message: "Invalid company user assignment" });
    }
  }

  try {
    const result = await pool.query(
      `UPDATE leads SET
        name=$1, email=$2, phone=$3, company_name=$4, source=$5,
        status=$6, estimated_value=$7, notes=$8, assigned_to=$9,
        updated_at=NOW()
       WHERE id=$10 AND company_id=$11
       RETURNING ${fields}`,
      [
        merged.name.trim(), email ? email.trim().toLowerCase() : null,
        merged.phone || null, merged.companyName || null,
        merged.source || "Other", merged.status, value,
        merged.notes || null, assignedId, id, req.user!.companyId,
      ]
    );

    return res.json({ message: "Lead updated", lead: result.rows[0] });
  } catch (error) {
    console.error("Update lead failed:", error);
    return res.status(500).json({ message: "Unable to update lead" });
  }
}

export async function deleteLead(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid lead ID" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM leads WHERE id = $1 AND company_id = $2 RETURNING id",
      [id, req.user!.companyId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Lead not found" });
    }

    return res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Delete lead failed:", error);
    return res.status(500).json({ message: "Unable to delete lead" });
  }
}
