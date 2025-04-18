import { AppDataSource } from "../../config/data-source";
export const checkServiceStatus = async ()=>{
  const services = [
    { 
      name: 'PostgreSQL', 
      status: 'unknown', 
      message: 'Checking database connection...' 
    },
    { 
      name: 'Web Server', 
      status: 'online', 
      message: '' 
    },
    { 
      name: 'Redis', 
      status: 'unknown', 
      message: 'Checking cache service...' 
    }
  ];
  try {
    await AppDataSource.query('SELECT 1');
    services[0].status = 'online';
    services[0].message = '';
    
  } catch (error) {
    services[0].status = 'offline';
    services[0].message = 'Connection failed: ' + (error instanceof Error ? error.message : 'Unknown error');
  }
  services[2].status = 'online'; // Simulated Redis check
  
  return services;
}