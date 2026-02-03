# 🏢 HotDesk

A modern, full-stack office desk booking system that enables employees to reserve hot desks through an interactive visual floor plan. Perfect for organizations with hybrid work arrangements and flexible workspace management.

![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![Express](https://img.shields.io/badge/Express-5.0-000000)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791)

## ✨ Key Features

### 👥 For Employees
- **Interactive Floor Plan** - Visual representation of 80 desks with real-time availability
- **Flexible Booking** - AM/PM time slots for half-day reservations
- **Bulk Booking** - Book multiple seats across multiple dates in one action
- **My Bookings** - View and manage personal reservations
- **Daily View** - See who booked which desks for team coordination

### 🔧 For Administrators
- **Seat Management** - Create, edit, block seats, and set long-term reservations
- **Visual Floor Plan Editor** - Drag-and-drop interface for seat layout configuration
- **User Management** - Manage users, assign roles, activate/deactivate accounts
- **Invite System** - Generate time-limited invite codes for controlled registration
- **Booking Management** - View and manage all system bookings

### 🔒 Security
- Invite-only registration system
- JWT-based authentication
- Role-based access control (Employee/Admin)
- Secure password hashing with bcrypt
- Session management with PostgreSQL storage

## 🛠️ Tech Stack

### Frontend
- **React 18.3** with TypeScript
- **Vite 7.3** - Lightning-fast build tool
- **Wouter 3.3** - Lightweight routing (~1.3KB)
- **TanStack React Query 5.60** - Powerful server state management
- **Tailwind CSS 3.4** - Utility-first styling
- **shadcn/ui** - 35+ accessible Radix UI components
- **React Hook Form + Zod** - Type-safe form validation
- **date-fns** - Modern date utility library
- **Recharts** - Charts for analytics
- **Framer Motion** - Smooth animations

### Backend
- **Node.js** with TypeScript
- **Express 5.0** - Web framework
- **PostgreSQL** - Relational database
- **Drizzle ORM 0.39** - Type-safe database queries
- **JWT (jsonwebtoken)** - Token-based authentication
- **bcryptjs** - Password hashing
- **express-session** - Session management


## 📋 Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher
- **npm** or **yarn**

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HotDesking-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/hotdesk
   PORT=5000
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```
   
   This will:
   - Create all required tables
   - Seed 80 desks with default floor layout
   - Create a default admin user
   - Generate an initial invite code (shown in console)

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   
   Open your browser to `http://localhost:5000`

## 🔑 Default Credentials

**Admin Account:**
- Email: `admin@company.com`
- Password: `admin123`

> ⚠️ **Important**: Change the default admin password immediately after first login in production environments!

## 📖 Usage

### First-Time Setup

1. Log in with the default admin credentials
2. Check the server console for the generated invite code
3. Go to Admin Panel → Invite Management to create additional invites
4. Share invite codes with employees for registration

### Employee Workflow

1. **Register** - Use an invite code to create an account
2. **Browse Floor Plan** - View available desks on the interactive floor plan
3. **Book a Desk** - Click a desk, select date and time slot (AM/PM)
4. **Bulk Booking** - Select multiple dates or use date range picker for recurring bookings
5. **View My Bookings** - See all your reservations and cancel if needed
6. **Check Daily Bookings** - See who's in the office on any given day

### Admin Workflow

1. **Seat Management**
   - Add/edit/delete seats
   - Block seats temporarily
   - Set long-term reservations
   - Configure seat properties (monitor availability, type)

2. **Floor Plan Editor**
   - Visual drag-and-drop interface
   - Configure clusters (groups of desks)
   - Set positions and rotations

3. **User Management**
   - View all registered users
   - Assign admin/employee roles
   - Activate/deactivate accounts

4. **Invite Management**
   - Generate invite codes
   - Set expiration dates (1-365 days)
   - Create email-specific invites
   - Revoke unused invites

## 📂 Project Structure

```
HotDesking-main/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── admin/       # Admin portal components
│   │   │   ├── booking/     # Booking interface components
│   │   │   ├── floor-plan/  # Interactive floor plan
│   │   │   ├── layout/      # Header and layout
│   │   │   └── ui/          # shadcn/ui component library
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and helpers
│   │   ├── pages/           # Route pages
│   │   └── App.tsx          # Main app with routing
│   └── index.html
├── server/                   # Backend Express application
│   ├── auth/                # Authentication logic
│   ├── db.ts                # Database connection
│   ├── routes.ts            # API endpoints
│   ├── seed.ts              # Database seeding
│   └── storage.ts           # Database operations
├── shared/                   # Shared TypeScript types
│   ├── schema.ts            # Drizzle database schema
│   └── models/              # Shared data models
├── script/
│   └── build.ts             # Production build script
├── package.json
├── drizzle.config.ts        # Drizzle ORM configuration
├── vite.config.ts           # Vite configuration
└── tsconfig.json            # TypeScript configuration
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register with invite code
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - Logout

### Invites
- `POST /api/invites` - Create invite code (admin)
- `GET /api/invites` - List all invites (admin)
- `DELETE /api/invites/:id` - Revoke invite (admin)
- `POST /api/invites/validate` - Validate invite code

### Seats
- `GET /api/seats` - Get all seats
- `POST /api/seats` - Create seat (admin)
- `PUT /api/seats/:id` - Update seat (admin)
- `DELETE /api/seats/:id` - Delete seat (admin)
- `PUT /api/seats/:id/block` - Block/unblock seat (admin)

### Clusters
- `GET /api/clusters` - Get all clusters
- `POST /api/clusters` - Create cluster (admin)
- `PUT /api/clusters/:id` - Update cluster (admin)
- `DELETE /api/clusters/:id` - Delete cluster (admin)

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create booking
- `POST /api/bookings/bulk` - Create bulk bookings
- `GET /api/bookings/date/:date` - Get bookings by date
- `GET /api/bookings/user/:userId` - Get user's bookings
- `DELETE /api/bookings/:id` - Cancel booking

### Users
- `GET /api/users` - List all users (admin)
- `PUT /api/users/:id/role` - Update user role (admin)
- `PUT /api/users/:id/status` - Update user status (admin)

### User Role
- `GET /api/user-role` - Get current user's role

## 🗄️ Database Schema

### Core Tables

**users** - User accounts
- id, email, password (hashed), firstName, lastName, profileImageUrl

**userRoles** - Role assignments
- userId, role (employee/admin), isActive

**invites** - Registration invites
- id, code, email (optional), createdBy, usedBy, expiresAt, isActive

**seats** - Desk inventory
- id, name, type (solo/team_cluster), hasMonitor, isBlocked, positionX, positionY, clusterGroup

**clusters** - Desk groupings
- id, label, positionX, positionY, rotation, gridCols, gridRows

**bookings** - Reservations
- id, seatId, userId, userName, userEmail, date, slot (AM/PM), cancelledAt

**sessions** - Session storage
- sid, sess, expire

## 📜 Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Push schema changes to database
```

## 🏗️ Building for Production

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

The build script will:
- Bundle the server code to `dist/index.cjs`
- Bundle the client code to `dist/public/`
- Create an optimized production build ready for deployment

## 🌐 Deployment

### Environment Variables for Production
```env
DATABASE_URL=postgresql://user:password@host:port/database
PORT=5000
NODE_ENV=production
```

### Recommended Platforms
- **Railway** - Easy PostgreSQL + Node.js deployment
- **Render** - Free PostgreSQL and web service hosting
- **Fly.io** - Global edge deployment
- **Vercel/Netlify** + **Supabase** - Serverless frontend + managed PostgreSQL

### Pre-Deployment Checklist
- [ ] Change default admin password
- [ ] Set secure JWT secret (if implemented)
- [ ] Configure production DATABASE_URL
- [ ] Run database migrations (`npm run db:push`)
- [ ] Set NODE_ENV=production
- [ ] Configure CORS settings if needed
- [ ] Set up SSL/TLS for database connection

## 🔐 Security Considerations

1. **Change Default Credentials** - The default admin account should be secured immediately
2. **Invite Code Management** - Regularly review and revoke unused invites
3. **Database Backups** - Set up automated PostgreSQL backups
4. **Environment Variables** - Never commit `.env` files to version control
5. **HTTPS** - Always use HTTPS in production
6. **Rate Limiting** - Consider adding rate limiting for API endpoints
7. **Session Security** - Configure secure session settings for production

## 🎯 Roadmap

Future enhancements under consideration:
- [ ] Email notifications for booking confirmations
- [ ] Slack/Teams integration
- [ ] Mobile app (React Native)
- [ ] Recurring bookings (weekly patterns)
- [ ] Desk preferences and favorites
- [ ] Analytics dashboard for admin
- [ ] QR code check-in system
- [ ] Equipment booking (meeting rooms, parking)
- [ ] Calendar integration (Google Calendar, Outlook)

---

Built with ❤️ using React, Express, and PostgreSQL
