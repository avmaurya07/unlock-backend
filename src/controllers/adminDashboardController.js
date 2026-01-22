const mongoose = require("mongoose");
const User = require("../models/User");
const Publisher = require("../models/Publisher");
const Listing = require("../models/Listing");

function parseDateRange(req) {
  const { from, to } = req.query;

  const range = {};
  if (from) range.$gte = new Date(from);

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }

  return Object.keys(range).length ? range : null;
}

/**
 * GET /api/admin/dashboard/summary
 * Returns:
 * - total users, total publishers
 * - publisher subscription health (active/expired/suspended)
 * - listing status counts (pending/approved/rejected)
 * - pending approvals (same as pending)
 */
exports.getAdminSummaryStats = async (req, res) => {
  try {
    const now = new Date();
    const createdAtRange = parseDateRange(req);

    // Listing filters (optional date range)
    const listingFilter = {};
    if (createdAtRange) listingFilter.createdAt = createdAtRange;

    const [
      totalUsers,
      totalAdmins,
      totalPublishers,
      listingStatusCountsRaw,
      pendingApprovals,
      publisherHealthRaw
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "admin" }),
      Publisher.countDocuments({}),
      Listing.aggregate([
        { $match: listingFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Listing.countDocuments({ ...listingFilter, status: "pending" }),
      // Publisher subscription health computed by expiry + status
      Publisher.aggregate([
        {
          $addFields: {
            computedSubStatus: {
              $switch: {
                branches: [
                  { case: { $eq: ["$subscriptionStatus", "suspended"] }, then: "suspended" },
                  {
                    case: {
                      $and: [
                        { $eq: ["$subscriptionStatus", "active"] },
                        { $gte: ["$subscriptionExpiry", now] }
                      ]
                    },
                    then: "active"
                  }
                ],
                default: "expired"
              }
            }
          }
        },
        { $group: { _id: "$computedSubStatus", count: { $sum: 1 } } }
      ])
    ]);

    const listingStatusCounts = { pending: 0, approved: 0, rejected: 0 };
    for (const row of listingStatusCountsRaw) {
      listingStatusCounts[row._id] = row.count;
    }

    const publisherHealth = { active: 0, expired: 0, suspended: 0 };
    for (const row of publisherHealthRaw) {
      publisherHealth[row._id] = row.count;
    }

    return res.json({
      success: true,
      summary: {
        users: {
          totalUsers,
          totalAdmins,
          totalAccounts: totalUsers + totalAdmins
        },
        publishers: {
          totalPublishers,
          subscriptionHealth: publisherHealth
        },
        listings: {
          statusCounts: listingStatusCounts,
          pendingApprovals
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/dashboard/listings-by-type
 * Optional filters: ?status=approved&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
exports.getListingsByTypeStats = async (req, res) => {
  try {
    const createdAtRange = parseDateRange(req);
    const { status } = req.query;

    const match = {};
    if (createdAtRange) match.createdAt = createdAtRange;
    if (status && ["pending", "approved", "rejected"].includes(status)) match.status = status;

    // Listing.type = ObjectId -> lookup ListingType name
    const rows = await Listing.aggregate([
      { $match: match },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "listingtypes", // collection name (Mongoose auto pluralizes)
          localField: "_id",
          foreignField: "_id",
          as: "typeDoc"
        }
      },
      { $unwind: { path: "$typeDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          typeId: "$_id",
          typeName: { $ifNull: ["$typeDoc.name", "Unknown"] },
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/dashboard/listings-trends
 * Default: last 12 months (approved+pending+rejected) grouped monthly
 * Optional:
 *  - ?status=approved
 *  - ?months=6
 */
exports.getListingsTrendStats = async (req, res) => {
  try {
    const { status, months = 12 } = req.query;

    const m = Math.min(Math.max(parseInt(months, 10) || 12, 1), 24);

    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - (m - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const match = { createdAt: { $gte: start, $lte: now } };
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      match.status = status;
    }

    const rows = await Listing.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          count: 1
        }
      }
    ]);

    return res.json({
      success: true,
      range: { months: m, start, end: now },
      data: rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
