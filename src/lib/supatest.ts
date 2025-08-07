// supabaseClient.ts

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://trjnsgmdzzthtdbjtlme.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyam5zZ21kenp0aHRkYmp0bG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzE5ODIsImV4cCI6MjA2ODI0Nzk4Mn0.Gb4cBGFaCjXoT77-HNPRA-HUwtXDCzetF1PoNi9Oazk',
  {
    realtime: {
      params: {
        eventsPerSecond: 5,
      },
    },
  }
);

export function getSupabaseClient() {
  return supabase;
}
