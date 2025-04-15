"use strict";
// // src/seed.ts
// import { Role } from "../Entities/Role";
// import { AppDataSource } from "./data-source";
// export const seedRoles = async () => {
//   const roleRepo = AppDataSource.getRepository(Role);
//   const count = await roleRepo.count();
//   if (count === 0) {
//     const roles = [
//       roleRepo.create({ role_name: "Admin" }),
//       roleRepo.create({ role_name: "User" }),
//     ];
//     await roleRepo.save(roles);
//     console.log("✅ Default roles seeded.");
//   } else {
//     console.log("ℹ️ Roles already exist.");
//   }
// };
