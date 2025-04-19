import { DataSource } from "typeorm";
import dotenv from 'dotenv';
import { User } from "../Entities/User";
import { Role } from "../Entities/Role";
import { Jobs } from "../Entities/Jobs";
import { SecurityLog } from "../Entities/SecurityLog";
import { Application } from "../Entities/Application";
import { Interview } from "../Entities/Interview";


dotenv.config();
export const AppDataSource = new DataSource(
  {
    type: "postgres",
    host: process.env.LOCAL_DB_HOST,
    port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
    username: process.env.LOCAL_DB_USER,
    password: process.env.LOCAL_DB_PASSWORD,
    database: process.env.LOCAL_DB_NAME,
    synchronize: true,
    logging: false,
    ssl: {
      rejectUnauthorized: false
    },
    entities: [User, Role, Jobs, Application, Interview, SecurityLog]
  }
);

