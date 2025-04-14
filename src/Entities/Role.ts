import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";


@Entity()
export class Role extends BaseEntity{
  @PrimaryGeneratedColumn()
  role_id!:number

  @Column()
  role_name!: string;
  
  @OneToMany(() => User, user => user.role)
  users!: User[];
}