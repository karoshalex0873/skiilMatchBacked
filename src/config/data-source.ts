import { DataSource } from "typeorm";
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
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
  entities: [__dirname + '/../Entities/*.{ts,js}'],
});
