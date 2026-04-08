import express from "express";

export function registerRoutes(app: express.Application) {
  console.log('Registering simple routes...');
  
  app.get('/api/auth/user', (req, res) => {
    console.log('Auth user route called');
    res.status(401).json({ message: "Not authenticated" });
  });

  app.post('/api/auth/login', (req, res) => {
    console.log('Login route called');
    res.json({ message: "Login endpoint" });
  });

  console.log('Simple routes registered successfully');
}

