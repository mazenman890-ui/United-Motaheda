import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL  = "https://gntpxffonjvnvadjclpl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdudHB4ZmZvbmp2bnZhZGpjbHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzA4NzEsImV4cCI6MjA5MDQwNjg3MX0.hLDucOsGEci6iWq7eHS6RsQIZEpipBxjuqlep5f9Pcs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:          AsyncStorage,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
});
