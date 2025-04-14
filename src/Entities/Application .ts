import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";
import { Jobs } from "./Jobs";

@Entity()
export class Application extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // multiple applications can belong to a single user
  @ManyToOne(() => User, (user) => user.applications)
  user!: User;

  // Many applications application can be related to a sigle job
  @ManyToOne(() => Jobs, (job) => job.applications)
  job!: Jobs;

  @Column({ default: "pending" })
  status!: "pending" | "reviewed" | "accepted" | "rejected";

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  appliedAt!: Date;
}
