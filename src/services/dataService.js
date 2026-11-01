import {mockDataService} from './mock/mockDataService.js';

// UI components should import ONLY dataService from this file.
// Future implementation: swap this adapter for Laravel REST or Supabase.
// Mock is not a shared cloud database and must never be used for real users.
export const dataService=mockDataService;
export const dataBackend=dataService.backend;

// Example: await dataService.getOrders();
// Example: await dataService.createOrder({source:'online',items:[{product_id:'round5',quantity:2}]});
// Data model is stable: prices are integer centavos, dates ISO, statuses snake_case.
// Laravel adapter must map REST JSON to the same API. Supabase adapter maps table rows.
