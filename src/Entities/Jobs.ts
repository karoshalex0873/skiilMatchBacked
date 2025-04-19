import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { Application } from "./Application";

@Entity()
export class Jobs extends BaseEntity {
  @PrimaryGeneratedColumn({name:'job_id'})
  job_id!: number;

  @Column()
  title!: string;

  @Column()
  company!: string;

  @Column()
  location!: string;

  @Column({ nullable: true })
  matchPercentage?: number;

  @Column("simple-array", { nullable: true })
  skills!: string[];

  @Column({ nullable: true })
  experienceLevel?: string

  @Column({ nullable: true })
  salaryRange?: string;

  @Column()
  type!: 'Full-time' | 'Part-time' | 'Contract' | 'Remote';

  @Column()
  

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP"
  })
  postedDate!: Date;


  // Relation ships  Many users can have one Job
  @ManyToOne(() => User, user => user.jobs)
  user!: User;

  // One Job can have many users
  @OneToMany(() => Application, (application) => application.job)
  applications!: Application[];

}
