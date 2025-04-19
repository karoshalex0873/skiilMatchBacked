"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkServiceStatus = void 0;
const data_source_1 = require("../../config/data-source");
const checkServiceStatus = () => __awaiter(void 0, void 0, void 0, function* () {
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
        yield data_source_1.AppDataSource.query('SELECT 1');
        services[0].status = 'online';
        services[0].message = '';
    }
    catch (error) {
        services[0].status = 'offline';
        services[0].message = 'Connection failed: ' + (error instanceof Error ? error.message : 'Unknown error');
    }
    services[2].status = 'online'; // Simulated Redis check
    return services;
});
exports.checkServiceStatus = checkServiceStatus;
