
import { Response } from "express";
import { pool } from "../config/db";
import { AuthRequest } from "../middleware/auth";

export async function getDashboardSummary(
  req: AuthRequest,
  res: Response
) {
  const companyId = req.user!.companyId;

  try {
    const [summary, pipeline, recentLeads] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*)::int AS total_leads,
          COUNT(*) FILTER (WHERE status = 'Won')::int AS won_leads,
          COUNT(*) FILTER (WHERE status IN ('Qualified', 'Proposal'))::int
            AS qualified_leads,
          COALESCE(
            SUM(estimated_value) FILTER (WHERE status = 'Won'), 0
          )::numeric AS revenue
         FROM leads
         WHERE company_id = $1`,
        [companyId]
      ),

      pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM leads
         WHERE company_id = $1
         GROUP BY status`,
        [companyId]
      ),

      pool.query(
        `SELECT id, name, email, company_name AS "companyName",
                status, estimated_value AS "estimatedValue",
                created_at AS "createdAt"
         FROM leads
         WHERE company_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [companyId]
      ),
    ]);

    const stats = summary.rows[0];
    const totalLeads = stats.total_leads;
    const wonLeads = stats.won_leads;

    return res.json({
      metrics: {
        totalLeads,
        customers: wonLeads,
        qualifiedLeads: stats.qualified_leads,
        conversionRate:
          totalLeads > 0
            ? Number(((wonLeads / totalLeads) * 100).toFixed(1))
            : 0,
        revenue: Number(stats.revenue),
      },
      pipeline: pipeline.rows.map((row) => ({
        status: row.status,
        count: row.count,
      })),
      recentLeads: recentLeads.rows,
    });
  } catch (error) {
    console.error("Dashboard summary failed:", error);
    return res.status(500).json({
      message: "Unable to load dashboard summary",
    });
  }
}
