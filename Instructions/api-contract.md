# API Contract --- Cricket Statistics Application

## Authentication

### POST /api/auth/login

Request:

{ "username": "admin", "password": "password" }

Response:

{ "token": "`<jwt>`{=html}", "expiresAt": "...", "user": { "id": 1,
"username": "admin", "roles": \["Admin"\] } }

Never return password or password hash.

## Users

Admin only.

GET /api/users GET /api/users/{id} POST /api/users PUT /api/users/{id}
DELETE /api/users/{id}

## Players

GET /api/players GET /api/players/{id} POST /api/players PUT
/api/players/{id} DELETE /api/players/{id}

GET /api/players/{id}/statistics

## Teams

GET /api/teams GET /api/teams/{id} POST /api/teams PUT /api/teams/{id}
DELETE /api/teams/{id}

## Series

GET /api/series GET /api/series/{id} POST /api/series PUT
/api/series/{id} DELETE /api/series/{id}

## Matches

GET /api/matches GET /api/matches/{id} POST /api/matches PUT
/api/matches/{id} DELETE /api/matches/{id}

## Scorecard

GET /api/matches/{id}/scorecard POST /api/matches/{id}/scorecard PUT
/api/matches/{id}/scorecard

## Error Format

Use a consistent response such as:

{ "message": "Validation failed", "errors": { "team2Id": \[ "Team 2 is
required." \] } }

## HTTP Status Codes

200 OK 201 Created 204 No Content 400 Bad Request 401 Unauthorized 403
Forbidden 404 Not Found 409 Conflict 500 Internal Server Error

## API Rules

-   Use DTOs.
-   Validate input.
-   Do not expose EF entities.
-   Do not expose password hashes.
-   Use authorization attributes.
-   Use async database operations.
-   Use pagination for large list endpoints.
