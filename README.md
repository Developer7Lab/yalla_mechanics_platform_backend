# Mechanic App - Complete Web Application

A full-stack web application with role-based authentication, location management, and review system for mechanics and users.

## Features

### 🔐 Authentication System
- Session-based authentication with MongoDB session store
- Role-based access control (User, Mechanic, Admin)
- Secure password hashing with bcrypt
- Automatic role-based redirects

### 👤 Normal Users
- Browse mechanics and their locations
- View mechanic details and reviews
- Submit and manage reviews for mechanics
- Personalized user dashboard
- View own review history

### 🔧 Mechanics
- Request location updates through admin approval
- View location request status (pending/approved/rejected)
- View all reviews received from users
- Track average rating and total reviews
- Personalized mechanic dashboard

### 👨‍💼 Central Admin
- Approve or reject mechanic location requests
- Automatic SerpAPI integration for location data
- View all mechanics and their locations
- Monitor system statistics
- Manage pending requests

### 📍 Location System
- Mechanics submit location requests (address required, business name optional)
- Admin approves requests → SerpAPI fetches location data
- Location data includes: address, business name, rating, reviews, phone, website
- All data persists in MongoDB (survives server restarts)

### ⭐ Review System
- Users can review mechanics
- 5-star rating system
- Comment-based feedback
- Review history tracking
- Average rating calculation

## Technology Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Session Management**: express-session + connect-mongo
- **Authentication**: bcryptjs
- **Location Service**: SerpAPI (Google Maps API)
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Styling**: Modern gradient-based UI with responsive design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- SerpAPI account and API key

## Installation

### 1. Install Dependencies

\`\`\`bash
cd /home/ubuntu/mechanic-app
npm install
\`\`\`

### 2. Configure Environment Variables

Edit the \`.env\` file and add your configuration:

\`\`\`env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/mechanic-app

# Session Secret (change this in production)
SESSION_SECRET=your-secret-key-change-in-production

# SerpAPI Key (get from https://serpapi.com/)
SERPAPI_KEY=your_serpapi_key_here

# Server Port
PORT=3000

# Node Environment
NODE_ENV=development
\`\`\`

### 3. Start MongoDB

Make sure MongoDB is running on your system:

\`\`\`bash
# For local MongoDB
sudo systemctl start mongod

# Or if using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
\`\`\`

### 4. Seed Database with Test Users

\`\`\`bash
node seed.js
\`\`\`

This will create:
- **5 Normal Users**: user1, user2, user3, user4, user5 (password: password123)
- **5 Mechanics**: mechanic1, mechanic2, mechanic3, mechanic4, mechanic5 (password: password123)
- **1 Admin**: admin (password: admin123)

### 5. Start the Server

\`\`\`bash
npm start

# Or for development with auto-reload
npm run dev
\`\`\`

The application will be available at: **http://localhost:3000**

## Usage

### Login Credentials

#### Normal Users
- Username: `user1`, `user2`, `user3`, `user4`, `user5`
- Password: `password123`

#### Mechanics
- Username: `mechanic1`, `mechanic2`, `mechanic3`, `mechanic4`, `mechanic5`
- Password: `password123`

#### Admin
- Username: `admin`
- Password: `admin123`

### Workflow

#### As a Mechanic:
1. Login with mechanic credentials
2. Navigate to "Request Location Update"
3. Fill in address (required) and business name (optional)
4. Submit request
5. Wait for admin approval
6. Once approved, location will be visible to users

#### As Admin:
1. Login with admin credentials
2. View pending location requests
3. Click "Approve" to fetch location data from SerpAPI
4. Or click "Reject" to decline the request
5. View all mechanics and their locations

#### As a User:
1. Login with user credentials
2. Browse available mechanics
3. View mechanic locations and details
4. Click "Write Review" to submit feedback
5. View your review history

## Project Structure

\`\`\`
mechanic-app/
├── models/
│   ├── User.js                  # User schema (users, mechanics, admin)
│   ├── Review.js                # Review schema
│   ├── LocationRequest.js       # Location request schema
│   └── MechanicLocation.js      # Mechanic location schema
├── routes/
│   ├── auth.js                  # Authentication routes
│   ├── user.js                  # Normal user routes
│   ├── mechanic.js              # Mechanic routes
│   └── admin.js                 # Admin routes
├── middleware/
│   └── auth.js                  # Authentication middleware
├── utils/
│   └── serpapi.js               # SerpAPI integration
├── public/
│   ├── css/
│   │   └── styles.css           # Modern CSS styling
│   └── js/
│       └── main.js              # Client-side JavaScript
├── views/
│   ├── login.html               # Login page
│   ├── user-dashboard.html      # User dashboard
│   ├── mechanic-dashboard.html  # Mechanic dashboard
│   └── admin-dashboard.html     # Admin dashboard
├── server.js                    # Main Express server
├── seed.js                      # Database seeding script
├── package.json                 # Dependencies
├── .env                         # Environment variables
└── README.md                    # This file
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/check-session` - Check session status

### User Routes (Normal Users)
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/mechanics` - Get all mechanics with locations
- `GET /api/user/mechanics/:mechanicId/reviews` - Get reviews for a mechanic
- `POST /api/user/reviews` - Submit a review
- `GET /api/user/my-reviews` - Get user's own reviews

### Mechanic Routes
- `GET /api/mechanic/profile` - Get mechanic profile
- `PUT /api/mechanic/profile` - Update mechanic profile
- `GET /api/mechanic/location` - Get current location
- `POST /api/mechanic/location-request` - Submit location request
- `GET /api/mechanic/location-requests` - Get all location requests
- `GET /api/mechanic/reviews` - Get reviews for this mechanic

### Admin Routes
- `GET /api/admin/profile` - Get admin profile
- `GET /api/admin/location-requests/pending` - Get pending requests
- `GET /api/admin/location-requests` - Get all requests
- `POST /api/admin/location-requests/:requestId/approve` - Approve request
- `POST /api/admin/location-requests/:requestId/reject` - Reject request
- `GET /api/admin/mechanics` - Get all mechanics
- `GET /api/admin/stats` - Get system statistics

## Database Collections

### Users
Stores all users (normal users, mechanics, and admin)

### Reviews
Stores reviews submitted by users for mechanics

### LocationRequests
Stores location update requests from mechanics (pending/approved/rejected)

### MechanicLocations
Stores current approved locations for mechanics

### Sessions
Stores user session data (managed by connect-mongo)

## Data Persistence

All data is stored in MongoDB and persists across server restarts:
- User accounts and profiles
- Reviews (permanent)
- Location requests (all states)
- Current mechanic locations
- Session data

## SerpAPI Integration

The application uses SerpAPI's Google Maps API to fetch location data:

1. Mechanic submits location request with address (+ optional business name)
2. Admin approves request
3. Backend queries SerpAPI with the address
4. Location data is fetched and stored in MongoDB
5. Data includes: title, address, rating, reviews, phone, website, GPS coordinates

**Note**: You need a valid SerpAPI key. Get one at https://serpapi.com/

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- Session-based authentication
- Role-based access control middleware
- HTTP-only session cookies
- MongoDB injection prevention with Mongoose
- Input validation on all forms

## Customization

### Changing Styles
Edit `/public/css/styles.css` to customize colors, fonts, and layout.

### Adding New Roles
1. Update User model schema
2. Add new middleware in `/middleware/auth.js`
3. Create new routes in `/routes/`
4. Create new dashboard HTML in `/views/`

### Extending Features
- Add image uploads for mechanics
- Implement real-time notifications
- Add search and filter functionality
- Integrate maps for location display
- Add email notifications

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- Verify network connectivity

### SerpAPI Error
- Verify SERPAPI_KEY is correct in .env
- Check API quota and limits
- Ensure internet connectivity

### Session Issues
- Clear browser cookies
- Check SESSION_SECRET in .env
- Restart the server

### Port Already in Use
- Change PORT in .env file
- Or kill the process using the port:
  \`\`\`bash
  lsof -ti:3000 | xargs kill -9
  \`\`\`

## Development

### Running in Development Mode

\`\`\`bash
npm run dev
\`\`\`

This uses nodemon for auto-reload on file changes.

### Testing

1. Seed the database: \`node seed.js\`
2. Login as different roles
3. Test each feature workflow
4. Check MongoDB data persistence

## Production Deployment

### Environment Setup

1. Set NODE_ENV=production in .env
2. Use a strong SESSION_SECRET
3. Enable HTTPS and set secure: true for cookies
4. Use a production MongoDB instance (MongoDB Atlas recommended)
5. Set up proper logging
6. Configure reverse proxy (nginx/Apache)

### Deployment Checklist

- [ ] Update all environment variables
- [ ] Enable HTTPS
- [ ] Set secure session cookies
- [ ] Configure MongoDB backup
- [ ] Set up monitoring and logging
- [ ] Configure firewall rules
- [ ] Set up domain and DNS
- [ ] Test all features in production

## License

This project is provided as-is for educational and commercial use.

## Support

For issues or questions, refer to the documentation or check:
- MongoDB documentation: https://docs.mongodb.com/
- Express.js documentation: https://expressjs.com/
- SerpAPI documentation: https://serpapi.com/docs

---

**Built with ❤️ for mechanic-user collaboration**
