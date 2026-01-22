const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/publisher", require("./routes/publisherRoutes"));
app.use("/api/listings", require("./routes/listingRoutes"));
app.use("/api/admin/listings", require("./routes/adminListingRoutes"));
app.use("/api/publisher/dashboard", require("./routes/publisherDashboardRoutes"));
app.use("/api/uploads", require("./routes/uploadRoutes"));
app.use("/api/admin/dashboard", require("./routes/adminDashboardRoutes"));
app.use("/api/public", require("./routes/publicRoutes"));
app.use("/api/admin/publisher-types", require("./routes/adminPublisherTypeRoutes"));
app.use("/api/admin/event-categories", require("./routes/adminEventCategoryRoutes"));
app.use("/api/admin/job-categories", require("./routes/adminJobCategoryRoutes"));
app.use("/api/publisher/jobs", require("./routes/publisherJobRoutes"));
app.use("/api/admin/challenge-categories", require("./routes/adminChallengeCategoryRoutes"));
app.use("/api/admin/organizer-types", require("./routes/adminOrganizerTypeRoutes"));
app.use("/api/admin/startup-stages", require("./routes/adminStartupStageRoutes"));
app.use("/api/publisher/funding-calls", require("./routes/publisherFundingRoutes"));


app.get("/", (req, res) => res.send("Backend API Running..."));

module.exports = app;
