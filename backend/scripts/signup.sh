#!/usr/bin/env bash
# Run this script to create a test user via the backend signup endpoint.
# Make sure your backend is running on http://localhost:8080 before running.

curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
