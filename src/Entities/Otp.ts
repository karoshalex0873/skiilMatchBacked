import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";


@Entity()
export class Otp  extends BaseEntity{
  @PrimaryGeneratedColumn("uuid")
  otp_id!: string; // UUID for OTP ID
  @Column()
  code!: string; // 6 digit OTP code
  @Column()
  expiresAt!: Date; // Expiration date and time for the OTP
  @ManyToOne(()=>User,(user)=>user.otps)
  user!: User;

}
