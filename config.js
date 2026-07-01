// Supabase projenin Settings > API sayfasından bu iki değeri kopyala.
// Anon (public) key kullanılmalı, service_role key ASLA buraya girilmemeli.

const SUPABASE_URL = "https://bducmucfhahfetgteeuh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkdWNtdWNmaGFoZmV0Z3RlZXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDkyNTYsImV4cCI6MjA5ODQ4NTI1Nn0.Ae01HmJCJLvqOryal2S1iZrb909MZTS7R-MSKCuYmcM";

// İsteğe bağlı basit PIN kilidi. Boş bırakırsan ("") kilit ekranı hiç açılmaz.
// Bu güvenlik amaçlı değildir, sadece rastgele birinin telefonuna göz atmasını zorlaştırır.
const APP_PIN = "";
