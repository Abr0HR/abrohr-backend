# AbrO HR - Employee Attendance Tracking System (Backend)

A comprehensive, production-ready backend API for employee attendance tracking built with Node.js, Express, and PostgreSQL.

## Features

- **Multi-mode Attendance Punch**: Office, WFH (Work From Home), and On-Duty modes
- **Shift Management**: Flexible shift configuration with multiple shift types
- **Work From Home (WFH) Flexibility**: Trust-based WFH without oppressive monitoring
- **Labour Law Compliance**: 
  - 48-hour work week enforcement
  - 2x overtime calculation
  - Night shift restrictions
- **Data Privacy & Protection Act (DPDP) Compliance**: Full consent management
- **Role-Based Access Control (RBAC)**: Admin, Manager, and Employee roles
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API request rate limiting
- **Swagger Documentation**: Auto-generated API documentation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, helmet, cors
- **Validation**: Joi
- **API Documentation**: Swagger/OpenAPI
- **Hosting**: Railway

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Abr0HR/abrohr-backend.git
   cd abrohr-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   ```

4. **Run the application**
   ```bash
   npm start        # Production mode
   npm run dev      # Development mode with nodemon
   ```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your_secret_key
FRONTEND_URL=https://your-frontend-url.com
```

## API Endpoints

### Health Check
- `GET /health` - Server status
- `GET /api/health/db` - Database connection status

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token

### Attendance
- `POST /api/attendance/punch` - Record punch (in/out)
- `GET /api/attendance/records` - Get attendance records
- `GET /api/attendance/summary` - Get attendance summary

## Deployment

### Deploy to Railway

1. **Create Railway account** at https://railway.app

2. **Connect GitHub repository**
   - New Project → GitHub
   - Select `abrohr-backend` repository

3. **Set environment variables**
   - Go to Variables tab
   - Add all required variables from `.env.example`

4. **Configure database**
   - Add PostgreSQL plugin or use Supabase
   - Update `DATABASE_URL`

5. **Deploy**
   - Railway auto-deploys on git push
   - View logs in dashboard

### Database Setup

Using Supabase:
1. Create project at https://supabase.com
2. Run SQL schema (see schema.sql)
3. Get connection string from settings

## API Documentation

Swagger docs available at: `https://your-api-url/api-docs`

## Development

### Code Structure
```
src/
├── index.js           # Main server file
├── routes/            # API route handlers
├── controllers/       # Business logic
├── models/           # Database models
├── middleware/       # Custom middleware
├── utils/            # Utility functions
└── config/           # Configuration files
```

## Security Features

- JWT token authentication
- Password hashing with bcryptjs
- CORS protection
- Helmet security headers
- Rate limiting
- Input validation with Joi
- SQL injection prevention

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT

## Support

For issues and questions, please create a GitHub issue.
