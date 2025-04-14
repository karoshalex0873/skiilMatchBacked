"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = require("../Entities/User");
const Role_1 = require("../Entities/Role");
const Jobs_1 = require("../Entities/Jobs");
const Application_1 = require("../Entities/Application ");
dotenv_1.default.config();
const isProduction = process.env.NODE_ENV === 'production';
exports.AppDataSource = new typeorm_1.DataSource(isProduction ?
    // Production configuration (Render)
    {
        type: "postgres",
        url: process.env.DB_URL,
        synchronize: true,
        logging: false,
        entities: [User_1.User, Role_1.Role, Jobs_1.Jobs, Application_1.Application],
        ssl: true,
        extra: {
            ssl: {
                rejectUnauthorized: false,
                require: true
            }
        }
    }
    :
        // Local development configuration
        {
            type: "postgres",
            host: process.env.LOCAL_DB_HOST,
            port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
            username: process.env.LOCAL_DB_USER,
            password: process.env.LOCAL_DB_PASSWORD,
            database: process.env.LOCAL_DB_NAME,
            synchronize: true,
            logging: false,
            entities: [User_1.User, Role_1.Role, Jobs_1.Jobs, Application_1.Application]
        });
// Initialize and test connection
