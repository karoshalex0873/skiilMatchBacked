"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const protect_1 = require("../midllewares/auth/protect");
const usersControllers_1 = require("../controllers/usersControllers");
const roleGuard_1 = require("../midllewares/auth/roleGuard");
const router = express_1.default.Router();
router.get('/info', protect_1.protect, usersControllers_1.userInfo);
router.patch('/update', protect_1.protect, roleGuard_1.jobSeeker, usersControllers_1.updateUser);
router.get('/analytics/recruiter', protect_1.protect, usersControllers_1.recruiterAnalytics);
router.get('/manageUser', protect_1.protect, usersControllers_1.getUserManagementData);
exports.default = router;
