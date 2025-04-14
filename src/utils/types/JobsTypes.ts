import { Request } from "express";
import { User } from "./Usertype";

export interface Job {
  job_id: number;
  title: string;
  company: string;
  location: string;
  matchPercentage: number;
  skills: string[];
  experienceLevel: string;
  postedDate: Date;
  salaryRange: string;
  type: string;
}

export interface JobRequest extends Request {
  user?: User; 
}
