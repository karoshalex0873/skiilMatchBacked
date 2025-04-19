"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const systemController_1 = require("../controllers/systemController");
const protect_1 = require("../midllewares/auth/protect");
const router = express_1.default.Router();
router.get("/system-performance", systemController_1.systemController);
router.get("/systemAIAcurracy", protect_1.protect, systemController_1.systemAIAcurracy);
router.get("/systemSecurity", protect_1.protect, systemController_1.systemSecurity);
exports.default = router;
