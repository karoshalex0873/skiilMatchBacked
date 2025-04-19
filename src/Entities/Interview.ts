import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Application } from "./Application";
import { User } from "./User";
import { Jobs } from "./Jobs";


@Entity()
export class Interview extends BaseEntity{

  @PrimaryGeneratedColumn()
  interview_id!: number;

  // relate to application table
  @ManyToOne(() => Application, (application) => application.interviews, {
    onDelete: 'CASCADE'
  })
  application!: Application;


  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @ManyToOne(() => Jobs, { nullable: true })
  job?: Jobs;

  @Column()
  mode!: "online" | "in-person" | "phone";

  @Column({ type: "timestamp" })
  scheduledAt!: Date;

  @Column({ default: "scheduled" })
  status!: "scheduled" | "completed" | "cancelled";

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "text", nullable: true })
  feedback?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
