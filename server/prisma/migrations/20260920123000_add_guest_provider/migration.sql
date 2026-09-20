-- Allow passwordless browser sessions (iLovePDF-style)
ALTER TYPE "Provider" ADD VALUE IF NOT EXISTS 'guest';
