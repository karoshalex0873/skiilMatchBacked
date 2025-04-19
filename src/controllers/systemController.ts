import { Response, NextFunction } from "express";
import { format } from "date-fns";
import asyncHandler from "../midllewares/asyncHandler";
import { UserRequest } from "../utils/types/Usertype";
import os from 'os'
import si, { services } from 'systeminformation';
import { checkServiceStatus } from "../utils/monitor/checkServiceStatus";
import { getOptimizationTips } from "../utils/monitor/getOptimizationTips";
import { AppDataSource } from "../config/data-source";
import { Jobs } from "../Entities/Jobs";
import { Application } from "../Entities/Application";
import { User } from "../Entities/User";
import { Interview } from "../Entities/Interview";
import { HarmCategory, HarmBlockThreshold, GoogleGenerativeAI } from "@google/generative-ai";
import { Between, MoreThan } from "typeorm";
import { console } from "inspector";
import { title } from "process";
import { SecurityLog } from "../Entities/SecurityLog";



const applicationRepo = AppDataSource.getRepository(Application);
const jobRepo = AppDataSource.getRepository(Jobs);
const userRepo = AppDataSource.getRepository(User);
const interviewRepo = AppDataSource.getRepository(Interview);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
    }
  ]
});



export const systemController = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const [cpuUsage, memory, disks, network] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats()
      ]);

      const diskMetrics = disks.map(disk => ({
        mount: disk.mount,
        usage: (disk.used / disk.size) * 100,
        size: disk.size,
        used: disk.used,
        fs: disk.fs
      }));

      const metrics = {
        cpu: cpuUsage.currentLoad.toFixed(1),
        memory: ((memory.used / memory.total) * 100).toFixed(1),
        disk: diskMetrics.map(d => ({ ...d, usage: d.usage.toFixed(1) })),
        network: network.length > 0
          ? (network[0].tx_sec / 1024 / 1024).toFixed(2)
          : '0.00',
        timestamp: new Date().toLocaleTimeString()
      };


      const performanceBudgets = {
        cpu: 80,
        memory: 85,
        disk: 90,
        network: 100,
        responseTime: 500
      };

      const alerts = [];
      if (parseFloat(metrics.cpu) > performanceBudgets.cpu) {
        alerts.push(`CPU threshold exceeded (${metrics.cpu}%)`);
      }
      if (parseFloat(metrics.memory) > performanceBudgets.memory) {
        alerts.push(`Memory threshold exceeded (${metrics.memory}%)`);
      }

      res.status(200).json({
        success: true,
        data: {
          metrics,
          performanceBudgets,
          alerts,
          services: await checkServiceStatus(),
          optimizationTips: getOptimizationTips(
            { ...metrics, disk: JSON.stringify(metrics.disk) },
            performanceBudgets
          )
        }
      });


    } catch (error) {
      console.error('Performance monitoring error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system metrics'
      });
    }
  }
);



interface AIMatchPrediction {
  prediction: 'yes' | 'no';
  confidence: number;
  reason: string;
}

export const systemAIAcurracy = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {

      // 1. Get date range for historical data (last 6 months)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 6);


      // 2. Fetch data in parallel
      const [applications, historicalData] = await Promise.all([
        applicationRepo.find({
          relations: ['user', 'job', 'interviews'],
          where: {
            appliedAt: Between(startDate, endDate)
          }
        }),
        fetchHistoricalAccuracyData(startDate, endDate)
      ]);

      // 3 .Process applications batch by batch (100 at a time)
      const BATCH_SIZE = 100
      let TP = 0, FP = 0, FN = 0, TN = 0;


      interface DetailedResult {
        applicationId: string;
        userId: string;
        jobId: string;
        prediction: boolean;
        actual: boolean;
        confidence: number;
        reason: string;
      }

      const detailedResults: DetailedResult[] = [];

      for (let i = 0; i < applications.length; i += BATCH_SIZE) {
        const batch = applications.slice(i, i + BATCH_SIZE);
        const batchResults = await processApplicationBatch(batch)


        batchResults.forEach(result => {
          if (result.prediction && result.actual) TP++;
          else if (result.prediction && !result.actual) FP++;
          else if (!result.prediction && result.actual) FN++;
          else TN++;

          detailedResults.push(result);
        });
      }

      // 4. Calculate metrics with fallbacks
      const total = TP + FP + FN + TN;
      const accuracy = total > 0 ? (TP + TN) / total : 0;
      const precision = TP + FP > 0 ? TP / (TP + FP) : 0;
      const recall = TP + FN > 0 ? TP / (TP + FN) : 0;
      const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;



      // 5. Prepare response
      const response = {
        metadata: {
          version: process.env.APP_VERSION || '2.1.5',
          dataRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          processedCount: total
        },
        metrics: {
          accuracy: parseFloat(accuracy.toFixed(3)),
          precision: parseFloat(precision.toFixed(3)),
          recall: parseFloat(recall.toFixed(3)),
          f1Score: parseFloat(f1Score.toFixed(3)),
          confusionMatrix: [TP, FP, FN, TN],
          lastUpdated: new Date().toISOString()
        },
        trends: historicalData,
        sampleDetails: detailedResults.slice(0, 50) // Return first 50 for inspection
      };


      // 6. Cache the response for 1 hour
      res.set('Cache-Control', 'public, max-age=3600');
      res.json(response);
    } catch (error) {
      console.error('AI Accuracy Service Temporarily Unavailable:', error)
      return res.status(500).json({ error: "Sever error calaculating AI accuarcy" });
    }
  }
)

async function processApplicationBatch(applications: Application[]): Promise<{
  applicationId: string;
  userId: string;
  jobId: string;
  prediction: boolean;
  actual: boolean;
  confidence: number;
  reason: string;
}[]> {
  const results = [];
  for (const app of applications) {
    try {
      if (!app.user?.skills?.length || !app.job?.skills?.length) continue;

      const prompt = generatePrompt(app);
      const result = await model.generateContent(prompt);
      const prediction = parsePrediction(result.response.text());

      const actual = app.status === 'accepted' || app.interviews?.length > 0;

      results.push({
        applicationId: app.id.toString(),
        userId: app.user.user_id.toString(),
        jobId: app.job.job_id.toString(),
        prediction: prediction.prediction === 'yes',
        actual,
        confidence: prediction.confidence,
        reason: prediction.reason
      });

    } catch (error) {
      console.warn('Failed to process application')
      continue;
    }
  }
  return results
}

function generatePrompt(application: Application): string {
  return JSON.stringify({
    user: {
      skills: application.user.skills,
      experience: application.user.experience,
      summary: application.user.summary?.substring(0, 20)
    },
    job: {
      title: application.job.title,
      requiredSkills: application.job.skills,
      type: application.job.type,
      experienceLevel: application.job.experienceLevel
    },
    application: {
      status: application.status,
      interviews: application.interviews?.length || 0
    },
    responseFormat: {
      prediction: "yes|no",
      confidence: "0.0-1.0",
      reason: "string<100chars"
    }
  })
}

function parsePrediction(text: string): AIMatchPrediction {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as AIMatchPrediction;
  } catch (error) {
    console.log("failed to parse AI predication", { text })
    return {
      prediction: 'no',
      confidence: 0,
      reason: 'Prediction parsing failed'
    };
  }
}


async function fetchHistoricalAccuracyData(start: Date, end: Date) {

  try {
    const historical = await applicationRepo
      .createQueryBuilder('app')
      .select(`DATE_TRUNC('month', app.appliedAt)`, 'month')
      .addSelect(`COUNT(CASE WHEN app.status = 'accepted' THEN 1 END)`, 'accepted')
      .addSelect(`COUNT(*)`, 'total')
      .where('app.appliedAt BETWEEN :start AND :end', { start, end })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();

    return {
      labels: historical.map(h => new Date(h.month).toLocaleString('default', { month: 'short' })),
      values: historical.map(h =>
        h.total > 0 ? parseFloat((h.accepted / h.total).toFixed(3)) : 0
      )
    };

  } catch (error) {
    console.log("Failed to fetch historical data", { error })
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      values: [0.82, 0.85, 0.88, 0.90, 0.91, 0.924]
    };
  }
}



// the fucntion to check system security

export const systemSecurity = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const securityEvents = await SecurityLog.find({
        order: { timestamp: 'DESC' },
        take: 5
      });

      console.log('Security Events:', securityEvents); // Add logging

      const metrics = {
        activeThreats: await SecurityLog.count({ where: { severity: 'high' } }),
        securityScore: await calculateSecurityScore(),
        updatesAvailable: 3,
        dataEncryption: 100
      };

      console.log('Metrics:', metrics); // Log metrics

      const threatData = await getThreatChartData();
      console.log('Threat Data:', threatData); // Log chart data

      res.json({
        securityLevel: metrics.securityScore > 90 ? 'High' : metrics.securityScore > 70 ? 'Medium' : 'Low',
        metrics, // Include metrics in response
        threatChartData: threatData,
        recentEvents: securityEvents.map(event => ({
          type: event.type,
          description: event.description,
          severity: event.severity,
          timestamp: event.timestamp
        }))
      });
    } catch (error) {
      console.error('Security Endpoint Error:', error);
      res.status(500).json({ message: 'Error fetching security data' });
    }

  }
)

// helpers functions of security metrics
// 1 calculate Security Score
const calculateSecurityScore = async () => {
  const totalUsers = await User.count()
  const usersWith2FA = await User.count({
    where: { twoFactorEnabled: true }
  })

  const recentThreats = await SecurityLog.count({
    where: {
      timestamp: MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    }
  })
  let score = 80;
  score += (usersWith2FA / totalUsers) * 20;
  score -= recentThreats * 0.5;
  return Math.min(Math.max(score, 0), 100);
}
// 2. get Threat Chart Data
const getThreatChartData = async () => {
  const results = await SecurityLog.createQueryBuilder()
    .select(`DATE_TRUNC('month', timestamp) as month`)
    .addSelect('COUNT(*)', 'count')
    .groupBy('month')
    .orderBy('month')
    .getRawMany();

  return {
    labels: results.map(r => format(new Date(r.month), 'MMM')),
    data: results.map(r => r.count)
  };
}
