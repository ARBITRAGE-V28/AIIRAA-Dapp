import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(
  "https://iglcfvgnwtlppweqdhwz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbGNmdmdud3RscHB3ZXFkaHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDI1MTAsImV4cCI6MjA5MTkxODUxMH0.EzMscumlZ1I_fm1vXhDAhReMg2iuB2NrqII4B05r3DA"
);

window.supabaseClient = supabaseClient;
export { supabaseClient };