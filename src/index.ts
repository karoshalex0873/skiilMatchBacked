import express from 'express';
import dotenv from 'dotenv';
import { AppDataSource } from './config/data-source';
import authRoutes from './routes/authRoutes';
import cookieParser from "cookie-parser";
import cors from 'cors'
import jobsRoutes from './routes/jobsRoutes';
import userRoutes from './routes/userRoutes';
import { seedRoles } from './config/seed';


dotenv.config();

//instace of express
const app = express();

// connect to the database

// load port from .env
const PORT = process.env.PORT

const corsOptions = {
  origin: [
    "http://localhost:4200",
    "http://dkskillmatch.s3-website.eu-north-1.amazonaws.com",
    "https://skill-matc-ai-frontend.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // For preflight requests


// ✅ Then other middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));




// welcome message
app.get('', (req, res) => {
  res.send("Welcome to the server !");
})


// Authentication router
app.use('/api/v1/auth', authRoutes)



//router for post questions
app.use('/api/v1/jobs', jobsRoutes)

// user Routes
app.use('/api/v1/user', userRoutes)





// database initilization


AppDataSource.initialize()
  .then(async () => {
    console.log("🚀 Database connected successfully");

    // 🌱 Seed roles before anything else
    await seedRoles();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });


  })
  .catch((error) => console.log("Database connection error:", error));


// start server






