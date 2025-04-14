"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobSeekerAndEmployer = exports.Admin = exports.Employer = exports.jobSeeker = void 0;
const asyncHandler_1 = __importDefault(require("../asyncHandler"));
const roleGuard = (allowedRoles) => (0, asyncHandler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!req.user || !allowedRoles.includes(req.user.role.toString())) {
        console.log((_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
        res.status(403).json({ message: "Access denied !!" });
        return;
    }
    next();
}));
const jobSeeker = roleGuard(["1"]);
exports.jobSeeker = jobSeeker;
const Employer = roleGuard(['2']);
exports.Employer = Employer;
const jobSeekerAndEmployer = roleGuard(['1', '2']);
exports.jobSeekerAndEmployer = jobSeekerAndEmployer;
const Admin = roleGuard(['3']);
exports.Admin = Admin;
