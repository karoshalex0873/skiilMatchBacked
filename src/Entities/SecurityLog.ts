import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";


@Entity()
export class SecurityLog extends BaseEntity{
  @PrimaryGeneratedColumn()
  id!:number

  @Column()
  type!: "login_attempt" | "patch" | "threat" | "system" | "login";

  @Column()
  severity!: 'low' | 'medium' | 'high';

  @Column()
  description!: string;

  @CreateDateColumn({ type: 'timestamptz' }) // PostgreSQL
  timestamp!: Date;

  @ManyToOne(() => User, { nullable: true })
  user?: User;

}