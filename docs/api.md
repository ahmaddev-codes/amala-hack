# API Documentation

This document provides documentation for all API endpoints of Amala Map, and endpoints will be added as the project progresses.

## Table of Contents

- [Authentication](#authentication)
- [Locations API](#locations-api)
- [Reviews API](#reviews-api)
- [Moderation API](#moderation-api)
- [Discovery API](#discovery-api)
- [Analytics API](#analytics-api)
- [User Management API](#user-management-api)
- [AI Services API](#ai-services-api)
- [Error Handling](#error-handling)

## Authentication

All protected endpoints require Bearer token authentication using Firebase ID tokens.

```javascript
const token = await user.getIdToken();
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Role-Based Access Control

- **User**: Basic authenticated user (default role)
- **Scout**: Enhanced discovery features
- **Moderator**: Content moderation capabilities
- **Admin**: Full system access

## Locations API

### GET /api/locations

Retrieve locations with optional filtering.

**Parameters:**
- `status` (optional): Filter by status (`pending`, `approved`, `rejected`)
- `includeAll` (optional): Include all statuses (requires mod/admin role)
- `limit` (optional): Number of results to return
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "locations": [
    {
      "id": "location_id",
      "name": "Restaurant Name",
      "address": "Full Address",
      "coordinates": { "lat": 6.5244, "lng": 3.3792 },
      "description": "Restaurant description",
      "phone": "+234 xxx xxx xxxx",
      "website": "https://example.com",
      "rating": 4.5,
      "priceInfo": "$$",
      "cuisine": ["Nigerian", "Amala"],
      "status": "approved",
      "submittedBy": "user@example.com",
      "submittedAt": "2024-01-01T00:00:00Z",
      "images": ["image_url_1", "image_url_2"]
    }
  ]
}
```

### POST /api/locations

Submit a new location for review. **Requires authentication.**

**Request Body:**
```json
{
  "location": {
    "name": "Restaurant Name",
    "address": "Full Address",
    "coordinates": { "lat": 6.5244, "lng": 3.3792 },
    "description": "Restaurant description",
    "phone": "+234 xxx xxx xxxx",
    "website": "https://example.com",
    "rating": 4.5,
    "priceInfo": "$$",
    "cuisine": ["Nigerian", "Amala"],
    "openingHours": {}
  },
  "submitterInfo": {
    "timestamp": "2024-01-01T00:00:00Z",
    "userAgent": "Mozilla/5.0...",
    "source": "manual",
    "confidence": 1.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "locationId": "new_location_id",
  "message": "Location submitted for review"
}
```

## Reviews API

### GET /api/reviews

Retrieve reviews with optional filtering.

**Parameters:**
- `locationId` (optional): Filter by location
- `status` (optional): Filter by status (requires authentication)
- `limit` (optional): Number of results

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "review_id",
      "locationId": "location_id",
      "userId": "user_id",
      "rating": 5,
      "text": "Great food and service!",
      "images": ["image_url"],
      "status": "approved",
      "datePosted": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/reviews

Submit a new review. **Requires authentication.**

**Request Body:**
```json
{
  "locationId": "location_id",
  "rating": 5,
  "text": "Review text",
  "images": ["image_url_1", "image_url_2"]
}
```

### PATCH /api/reviews

Moderate reviews (approve/reject). **Requires mod/admin role.**

**Request Body:**
```json
{
  "reviewId": "review_id",
  "action": "approve", // or "reject"
  "moderatorNotes": "Optional notes"
}
```

## Moderation API

### GET /api/moderation

Get pending locations for moderation. **Requires mod/admin role.**

**Response:**
```json
{
  "success": true,
  "pendingLocations": [
    {
      "id": "location_id",
      "name": "Restaurant Name",
      "status": "pending",
      "submittedBy": "user@example.com",
      "submittedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/moderation

Moderate a location (approve/reject). **Requires mod/admin role.**

**Request Body:**
```json
{
  "locationId": "location_id",
  "action": "approve", // or "reject"
  "moderatorNotes": "Optional notes",
  "reason": "Optional rejection reason"
}
```

## Discovery API

### POST /api/discovery

Trigger autonomous discovery. **Requires mod/admin role.**

**Request Body:**
```json
{
  "region": "lagos", // or "global", "africa", etc.
  "searchTerms": ["amala", "nigerian food"],
  "maxResults": 50
}
```

**Response:**
```json
{
  "success": true,
  "discoveryId": "discovery_session_id",
  "message": "Discovery started",
  "estimatedDuration": "5-10 minutes"
}
```

### GET /api/discovery/stats

Get discovery statistics. **Requires mod/admin role.**

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalSessions": 25,
    "locationsDiscovered": 1250,
    "locationsApproved": 980,
    "averageConfidence": 0.85,
    "lastDiscovery": "2024-01-01T00:00:00Z"
  }
}
```

## Analytics API

### GET /api/analytics

Get platform analytics data.

**Parameters:**
- `timeRange` (optional): Time range for data (`7d`, `30d`, `90d`)
- `metric` (optional): Specific metric to retrieve

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalLocations": 1500,
    "totalReviews": 3200,
    "activeUsers": 450,
    "submissionsToday": 12,
    "approvalRate": 0.78
  }
}
```

### POST /api/analytics

Log analytics events.

**Request Body:**
```json
{
  "event": "location_view",
  "properties": {
    "locationId": "location_id",
    "userId": "user_id",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### GET /api/analytics/metrics

Get detailed metrics for dashboards. **Requires authentication.**

**Parameters:**
- `days` (optional): Number of days to include (default: 30)

**Response:**
```json
{
  "success": true,
  "metrics": {
    "dailySubmissions": [
      { "date": "2024-01-01", "count": 5 },
      { "date": "2024-01-02", "count": 8 }
    ],
    "verificationRate": 0.85,
    "averageApprovalTime": 2.5,
    "duplicateDetectionRate": 0.12
  }
}
```

## User Management API

### GET /api/users/manage

Search and list users. **Requires admin role.**

**Parameters:**
- `query` (optional): Search query
- `role` (optional): Filter by role
- `limit` (optional): Number of results

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "email": "user@example.com",
      "roles": ["user", "scout"],
      "createdAt": "2024-01-01T00:00:00Z",
      "lastActive": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/users/manage

Add or remove user roles. **Requires admin role.**

**Request Body:**
```json
{
  "email": "user@example.com",
  "action": "add", // or "remove"
  "role": "scout" // or "mod", "admin"
}
```

## AI Services API

### POST /api/ai/extract

Extract location information from text using AI.

**Request Body:**
```json
{
  "text": "I went to Mama Cass Amala on Victoria Island, Lagos. Great food!",
  "context": "review"
}
```

**Response:**
```json
{
  "success": true,
  "extracted": {
    "name": "Mama Cass Amala",
    "location": "Victoria Island, Lagos",
    "sentiment": "positive",
    "confidence": 0.92
  }
}
```

### POST /api/ai/location-search

AI-powered location search and discovery.

**Request Body:**
```json
{
  "query": "best amala spots in Lagos",
  "location": "Lagos, Nigeria",
  "radius": 10000
}
```

**Response:**
```json
{
  "success": true,
  "locations": [
    {
      "name": "Restaurant Name",
      "address": "Full Address",
      "confidence": 0.88,
      "source": "ai_discovery"
    }
  ]
}
```

## Error Handling

All API endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Public endpoints**: 100 requests per minute
- **Authenticated endpoints**: 1000 requests per minute
- **Admin endpoints**: 5000 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## Webhooks

The platform supports webhooks for real-time notifications:

### Location Status Updates

Triggered when location status changes.

**Payload:**
```json
{
  "event": "location.status_changed",
  "data": {
    "locationId": "location_id",
    "oldStatus": "pending",
    "newStatus": "approved",
    "moderatedBy": "mod@example.com",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### Review Submissions

Triggered when new reviews are submitted.

**Payload:**
```json
{
  "event": "review.submitted",
  "data": {
    "reviewId": "review_id",
    "locationId": "location_id",
    "userId": "user_id",
    "rating": 5,
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## SDK Examples - from this section downwards is not implemented yet
We're thinking of building beyond the project, by providing a robust SDK that native mobile and web developers can use to build on top of the platform.

### JavaScript/TypeScript

```typescript
import { AmalaAPI } from '@amala/sdk';

const api = new AmalaAPI({
  baseUrl: 'https://api.amala.com',
  apiKey: 'your-api-key'
});

// Get locations
const locations = await api.locations.list({
  status: 'approved',
  limit: 20
});

// Submit location
const newLocation = await api.locations.create({
  name: 'New Restaurant',
  address: 'Lagos, Nigeria',
  coordinates: { lat: 6.5244, lng: 3.3792 }
});
```

### Python

```python
from amala_sdk import AmalaAPI

api = AmalaAPI(
    base_url='https://api.amala.com',
    api_key='your-api-key'
)

# Get locations
locations = api.locations.list(status='approved', limit=20)

# Submit location
new_location = api.locations.create({
    'name': 'New Restaurant',
    'address': 'Lagos, Nigeria',
    'coordinates': {'lat': 6.5244, 'lng': 3.3792}
})
```

## Testing

### API Testing

Use the provided test suite to validate API functionality:

```bash
npm run test:api
```

### Postman Collection

Import the Postman collection for interactive API testing:
- [Amala API Collection](./postman/amala-api.json)

### Authentication Testing

Test authentication flows:

```javascript
// Test token validation
const response = await fetch('/api/auth/verify', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

For more information, see the [main documentation](../README.md) or contact the development team.
