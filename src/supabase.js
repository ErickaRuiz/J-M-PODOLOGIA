// src/supabase.js
import { createClient } from '@supabase/supabase-js';
// Agrega esto en tu <script setup> de Login.vue para solucionar el bloqueo:
const supabaseUrl = 'https://hbyuktnmadyrpajhwqvq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieXVrdG5tYWR5cnBhamh3cXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTM3OTYsImV4cCI6MjA5NDcyOTc5Nn0.gNYrVUPrS71IVx4NCjXBsAUki5zdRrdAkqt0DSK6Qwc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);