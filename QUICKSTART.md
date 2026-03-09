# Quick Start Guide

Get the Mechanic App running in 5 minutes!

## Prerequisites

- Node.js installed
- MongoDB running
- SerpAPI key (get free trial at https://serpapi.com/)

## Installation Steps

### 1. Navigate to Project Directory

\`\`\`bash
cd /home/ubuntu/mechanic-app
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure Environment

Edit the \`.env\` file and add your SerpAPI key:

\`\`\`bash
nano .env
\`\`\`

Update this line:
\`\`\`
SERPAPI_KEY=your_serpapi_key_here
\`\`\`

### 4. Start MongoDB

\`\`\`bash
# If MongoDB is not running, start it:
sudo systemctl start mongod

# Or if using Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest
\`\`\`

### 5. Seed Database

\`\`\`bash
node seed.js
\`\`\`

Expected output:
\`\`\`
Connected to MongoDB
Created user: user1
Created user: user2
...
Created mechanic: mechanic1
...
Created admin: admin
\`\`\`

### 6. Start the Server

\`\`\`bash
npm start
\`\`\`

You should see:
\`\`\`
Server running on http://localhost:3000
Connected to MongoDB
\`\`\`

### 7. Open in Browser

Visit: **http://localhost:3000**

## Test Accounts

### Normal Users
- **Username**: user1, user2, user3, user4, user5
- **Password**: password123

### Mechanics
- **Username**: mechanic1, mechanic2, mechanic3, mechanic4, mechanic5
- **Password**: password123

### Admin
- **Username**: admin
- **Password**: admin123

## Quick Test Workflow

### Test as Mechanic (mechanic1)

1. Login with username: `mechanic1`, password: `password123`
2. Click "Request Location Update"
3. Enter:
   - **Business Name**: Ali's Auto Repair (optional)
   - **Address**: 123 Main Street, New York, NY
4. Click "Submit Request"
5. You'll see "Location request submitted successfully"
6. Logout

### Test as Admin

1. Login with username: `admin`, password: `admin123`
2. You'll see the pending request from mechanic1
3. Click "✓ Approve" button
4. Wait a few seconds for SerpAPI to fetch location data
5. You'll see "Location request approved successfully!"
6. The mechanic's location is now visible
7. Logout

### Test as User (user1)

1. Login with username: `user1`, password: `password123`
2. You'll see mechanic1 with the approved location
3. Click "View Details" to see reviews
4. Click "Write Review"
5. Select rating (1-5 stars)
6. Write a comment
7. Click "Submit Review"
8. Your review is now visible to the mechanic

## Common Issues

### MongoDB Connection Error

**Error**: "MongooseServerSelectionError: connect ECONNREFUSED"

**Solution**:
\`\`\`bash
# Start MongoDB
sudo systemctl start mongod

# Or check if it's running
sudo systemctl status mongod
\`\`\`

### Port Already in Use

**Error**: "Error: listen EADDRINUSE: address already in use :::3000"

**Solution**:
\`\`\`bash
# Change port in .env file
PORT=3001

# Or kill the process
lsof -ti:3000 | xargs kill -9
\`\`\`

### SerpAPI Error

**Error**: "Failed to fetch location data from SerpAPI"

**Solution**:
- Check your SERPAPI_KEY in .env file
- Verify you have API credits remaining
- Check internet connectivity

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Customize the UI by editing `/public/css/styles.css`
- Add more features as needed

## Development Mode

For auto-reload during development:

\`\`\`bash
npm run dev
\`\`\`

## Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.

## Need Help?

- Check the logs for error messages
- Verify all environment variables are set correctly
- Ensure MongoDB is running
- Check that all dependencies are installed

---

**Enjoy using the Mechanic App! 🔧**
