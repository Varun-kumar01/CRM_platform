import { Request, Response } from "express";
import { PoolClient } from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../config/db";
import { randomUUID } from "crypto";

const registerSchema = z.object({
  companyName: z.string().trim().min(2).max(150),
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  industry: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
  companySlug: z.string().trim().min(1).max(180),
});

function createToken(user: {
  id: number;
  company_id: number;
  role: string;
}) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  return jwt.sign(
    {
      sub: String(user.id),
      companyId: String(user.company_id),
      role: user.role,
    },
    secret,
    { expiresIn: "1d" }
  );
}

function createSlug(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);

  return base || "company";
}

export async function registerCompany(
  req: Request,
  res: Response
) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid registration details",
      errors: parsed.error.flatten(),
    });
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(data.password, 12);

  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Company slugs must be unique.
    const baseSlug = createSlug(data.companyName);
    const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;

    const companyResult = await client.query(
      `INSERT INTO companies (name, slug, email, phone, industry)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, slug, email, industry`,
      [
        data.companyName,
        slug,
        email,
        data.phone || null,
        data.industry || null,
      ]
    );

    const company = companyResult.rows[0];

    const userResult = await client.query(
      `INSERT INTO users (company_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'company_admin')
       RETURNING id, company_id, name, email, role`,
      [company.id, data.name, email, passwordHash]
    );

    const user = userResult.rows[0];
    const token = createToken(user);

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Company registered successfully",
      token,
      company,
      user,
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined);
    }

    console.error("Registration failed:", error);

    return res.status(500).json({
      message: "Unable to register company",
    });
  } finally {
    client?.release();
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Provide a valid email, password and company slug",
    });
  }

  const { password, companySlug } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  try {
    const result = await pool.query(
      `SELECT u.id, u.company_id, u.name, u.email,
              u.password_hash, u.role, u.is_active,
              c.name AS company_name, c.slug AS company_slug
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1 AND c.slug = $2
       LIMIT 1`,
      [email, companySlug]
    );

    const user = result.rows[0];

    if (
      !user ||
      !user.is_active ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        message: "Invalid company, email or password",
      });
    }

    const token = createToken(user);

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        companyId: user.company_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      company: {
        id: user.company_id,
        name: user.company_name,
        slug: user.company_slug,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      message: "Unable to log in",
    });
  }
}