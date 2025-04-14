import { Request, Response, NextFunction } from "express";
import asyncHandler from "../asyncHandler"
import { RoleRequest } from "../../utils/types/userRoles";
import { UserRequest } from "../../utils/types/Usertype";



const roleGuard = (allowedRoles: string[]) =>
  asyncHandler<void, UserRequest>( 
    async (req: UserRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role.toString())) {
      console.log(req.user?.role)
      res.status(403).json({ message: "Access denied !!" });
      return
    }
    next();
  });

  const jobSeeker =roleGuard(["1"])
  const Employer=roleGuard(['2'])
  const jobSeekerAndEmployer=roleGuard(['1','2'])  
  const Admin=roleGuard(['3'])


  export {jobSeeker,Employer,Admin,jobSeekerAndEmployer}