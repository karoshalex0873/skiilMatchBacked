import {Request} from "express"

export interface User{
  user_id:number
  name:string
  email:string
  role:number,
  avatar?:string,
  password?:string
  createdAt?:Date
  updatedAt?: Date;
  skills?:string[]
  phone?:string;
  bio?:string;
  location?:string;
  dob?:string;
  gender?:string
}

export interface UserRequest extends Request {
  user?: User;
}