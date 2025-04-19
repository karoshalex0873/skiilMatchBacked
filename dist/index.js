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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const data_source_1 = require("./config/data-source");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const jobsRoutes_1 = __importDefault(require("./routes/jobsRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const systemRoutes_1 = __importDefault(require("./routes/systemRoutes"));
dotenv_1.default.config();
//instace of express
const app = (0, express_1.default)();
// connect to the database
// load port from .env
const PORT = process.env.PORT;
// middleware to parse json request bodies
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({
    origin: ["http://localhost:4200", "http://dkskillmatch.s3-website.eu-north-1.amazonaws.com", "https://skill-matc-ai-frontend.vercel.app/"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Include OPTIONS
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
// welcome message
app.get('', (req, res) => {
    res.send("Welcome to the server build with docker !");
});
// Authentication router
app.use('/api/v1/auth', authRoutes_1.default);
//router for post questions
app.use('/api/v1/jobs', jobsRoutes_1.default);
// user Routes
app.use('/api/v1/user', userRoutes_1.default);
// system routes
app.use('/api/v1', systemRoutes_1.default);
// database initilization
data_source_1.AppDataSource.initialize()
    .then(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log("🚀 Database connected successfully");
}))
    .catch((error) => console.log("Database connection error:", error));
// start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
