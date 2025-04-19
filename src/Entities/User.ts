import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { Role } from "./Role";
import { Jobs } from "./Jobs";
import { Application } from "./Application";


@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  user_id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  twoFactorEnabled!: boolean;

  @Column({ nullable: true })
  twoFactorSecret?: string;

  @ManyToOne(() => Role, role => role.users)
  role!: Role;

  // Optional fields
  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true, })
  experience?: string;

  @Column({ nullable: true })
  summary?: string


  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  location?: string;

  @Column('simple-array', { nullable: true })
  skills?: string[]

  @Column({ type: 'date', nullable: true })
  dob?: Date;

  @Column({ nullable: true })
  gender?: string;

  // CV file path or URL
  @Column({ nullable: true })
  cv?: string;

  @Column({ type: 'json', nullable: true })
  path?: any;


  // Relationships with tables
  @OneToMany(() => Jobs, job => job.user)
  jobs!: Jobs[];

  @OneToMany(() => Application, (application) => application.user)
  applications!: Application[];


  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP"
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP"
  })
  updatedAt!: Date;
}
