"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const insights_controller_1 = require("../controllers/insights.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateJWT);
router.get("/me", insights_controller_1.InsightsController.getMyInsights);
exports.default = router;
