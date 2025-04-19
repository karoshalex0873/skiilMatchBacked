import express from 'express';
import dotenv from 'dotenv';
import { AppDataSource } from './config/data-source';
import authRoutes from './routes/authRoutes';
import cookieParser from "cookie-parser";
import cors from 'cors'
import jobsRoutes from './routes/jobsRoutes';
import userRoutes from './routes/userRoutes';
import systemRoutes from './routes/systemRoutes';



dotenv.config();

//instace of express
const app = express();

// connect to the database

// load port from .env
const PORT = process.env.PORT

// middleware to parse json request bodies
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));


app.use(cors({
  origin: ["http://localhost:4200", "http://dkskillmatch.s3-website.eu-north-1.amazonaws.com", "https://skill-matc-ai-frontend.vercel.app/"],
  methods: ["GET", "POST", "PUT", "DELETE","PATCH" ,"OPTIONS"], // Include OPTIONS
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}))


// welcome message
app.get('', (req, res) => {
  res.send("Welcome to the server build with docker🔥🔥🚀🚀🚀🚀 !");
})


// Authentication router
app.use('/api/v1/auth', authRoutes)



//router for post questions
app.use('/api/v1/jobs', jobsRoutes)

// user Routes
app.use('/api/v1/user', userRoutes)

// system routes
app.use('/api/v1',systemRoutes)


// database initilization

AppDataSource.initialize()
  .then(async () => {
    console.log("🚀 Database connected successfully")
  })
  .catch((error) => console.log("Database connection error:", error));


// start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});





